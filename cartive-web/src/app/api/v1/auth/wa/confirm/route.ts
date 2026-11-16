import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  ConfigurationError,
  createSessionToken,
  databaseUnavailableResponse,
  getRequestIp,
  getSessionSecret,
  hashToken,
  isSameOrigin,
  SESSION_COOKIE,
  SESSION_LIFETIME_MS,
} from "@/lib/security";
import { hashLoginCode, LOGIN_CODE_PATTERN } from "@/lib/whatsapp-login";

const confirmationSchema = z.object({
  challengeId: z.string().min(1).max(64),
  code: z.string().trim().toUpperCase().regex(LOGIN_CODE_PATTERN),
}).strict();
const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
    );
  }

  const ip = getRequestIp(request);
  if (!ip) {
    return Response.json(
      { data: null, error: { code: "RATE_LIMIT_UNAVAILABLE", message: "Alamat jaringan belum tersedia dari proxy tepercaya." } },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { data: null, error: { code: "INVALID_JSON", message: "Data konfirmasi tidak terbaca." } },
      { status: 400 },
    );
  }
  const parsed = confirmationSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: "Masukkan nomor WhatsApp dan kode enam karakter yang valid." } },
      { status: 400 },
    );
  }

  try {
    const limit = await consumeRateLimit("wa-login-confirm-ip", ip, 10 * 60 * 1000, 20);
    if (!limit.allowed) {
      return Response.json(
        { data: null, error: { code: "RATE_LIMITED", message: "Terlalu banyak percobaan kode. Coba lagi beberapa menit." } },
        { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)) } },
      );
    }

    const sessionSecret = getSessionSecret();
    const token = createSessionToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
    const outcome = await getDb().$transaction(async (transaction) => {
      const challenge = await transaction.loginChallenge.findUnique({
        where: { id: parsed.data.challengeId },
        select: { id: true, waNumber: true, codeHash: true, consentPromo: true, expiresAt: true, attempts: true, consumedAt: true },
      });
      if (!challenge || challenge.consumedAt || challenge.expiresAt <= now) {
        return { result: "invalid" as const };
      }
      if (challenge.attempts >= MAX_ATTEMPTS) return { result: "locked" as const };

      const codeHash = hashLoginCode(challenge.waNumber, parsed.data.code, sessionSecret);
      const expectedHash = Buffer.from(challenge.codeHash, "hex");
      const submittedHash = Buffer.from(codeHash, "hex");
      const codeMatches = expectedHash.length === submittedHash.length &&
        timingSafeEqual(expectedHash, submittedHash);
      if (!codeMatches) {
        await transaction.loginChallenge.updateMany({
          where: {
            id: challenge.id,
            attempts: challenge.attempts,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          data: { attempts: { increment: 1 } },
        });
        return { result: challenge.attempts + 1 >= MAX_ATTEMPTS ? "locked" as const : "invalid" as const };
      }

      const consumed = await transaction.loginChallenge.updateMany({
        where: {
          id: challenge.id,
          codeHash,
          attempts: challenge.attempts,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now, attempts: { increment: 1 } },
      });
      if (consumed.count !== 1) return { result: "invalid" as const };

      const existing = await transaction.member.findUnique({
        where: { waNumber: challenge.waNumber },
        select: { id: true, deletedAt: true },
      });
      if (existing?.deletedAt) return { result: "invalid" as const };

      const member = await transaction.member.upsert({
        where: { waNumber: challenge.waNumber },
        create: {
          waNumber: challenge.waNumber,
          consentPrivacyAt: now,
          consentPromoAt: challenge.consentPromo ? now : null,
          waVerifiedAt: now,
        },
        update: {
          consentPrivacyAt: now,
          consentPromoAt: challenge.consentPromo ? now : null,
          waVerifiedAt: now,
          lastActivityAt: now,
          stampExpiryProcessedAt: null,
        },
        select: { id: true },
      });
      await transaction.session.create({
        data: {
          memberId: member.id,
          tokenHash: hashToken(token),
          expiresAt,
          verifiedAt: now,
        },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorEmail: "system:member-login",
          action: "MEMBER_LOGIN_VERIFIED",
          entityType: "Member",
          entityId: member.id,
          metadata: { method: "WHATSAPP_OTP" },
        },
      });
      return { result: "verified" as const };
    });

    if (outcome.result !== "verified") {
      return Response.json(
        {
          data: null,
          error: {
            code: outcome.result === "locked" ? "LOGIN_CODE_LOCKED" : "INVALID_LOGIN_CODE",
            message: outcome.result === "locked"
              ? "Batas percobaan kode tercapai. Minta kode baru untuk masuk."
              : "Kode salah, kedaluwarsa, atau tidak berlaku. Periksa kembali atau minta kode baru.",
          },
        },
        { status: outcome.result === "locked" ? 429 : 401 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
    return Response.json(
      { data: { signedIn: true }, error: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    if (error instanceof ConfigurationError) {
      return Response.json(
        { data: null, error: { code: "SERVICE_UNAVAILABLE", message: "Login belum dikonfigurasi dengan aman." } },
        { status: 503 },
      );
    }
    throw error;
  }
}
