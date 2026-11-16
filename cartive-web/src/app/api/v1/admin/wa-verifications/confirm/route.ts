import { createHmac } from "node:crypto";
import { z } from "zod";
import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { maskWhatsAppNumber } from "@/lib/phone";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  ConfigurationError,
  databaseUnavailableResponse,
  getSessionSecret,
  isSameOrigin,
} from "@/lib/security";

const confirmationSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-F0-9]{10}$/),
}).strict();

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
    );
  }

  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { data: null, error: { code: "INVALID_JSON", message: "Kode verifikasi tidak terbaca." } },
      { status: 400 },
    );
  }

  const parsed = confirmationSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: "Masukkan kode verifikasi yang valid." } },
      { status: 400 },
    );
  }

  try {
    const limit = await consumeRateLimit(
      "wa-verification-admin",
      access.email,
      10 * 60 * 1000,
      10,
    );
    if (!limit.allowed) {
      return Response.json(
        { data: null, error: { code: "RATE_LIMITED", message: "Terlalu banyak kode verifikasi. Coba lagi beberapa menit." } },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)) },
        },
      );
    }

    const codeHash = createHmac("sha256", getSessionSecret())
      .update(`wa-verification:${parsed.data.code}`)
      .digest("hex");
    const now = new Date();
    const outcome = await getDb().$transaction(async (transaction) => {
      const verification = await transaction.waVerification.findUnique({
        where: { codeHash },
        select: {
          id: true,
          memberId: true,
          expiresAt: true,
          confirmedAt: true,
          member: { select: { waNumber: true, waVerifiedAt: true } },
        },
      });
      if (!verification || verification.expiresAt <= now) {
        return { result: "invalid" as const };
      }
      if (verification.confirmedAt || verification.member.waVerifiedAt) {
        return { result: "already_verified" as const };
      }

      const confirmed = await transaction.waVerification.updateMany({
        where: { id: verification.id, codeHash, confirmedAt: null, expiresAt: { gt: now } },
        data: { confirmedAt: now, confirmedBy: access.email },
      });
      if (confirmed.count !== 1) return { result: "invalid" as const };

      await transaction.member.update({
        where: { id: verification.memberId },
        data: { waVerifiedAt: now, lastActivityAt: now, stampExpiryProcessedAt: null },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorEmail: access.email,
          action: "WHATSAPP_VERIFIED",
          entityType: "Member",
          entityId: verification.memberId,
          metadata: { verificationId: verification.id },
        },
      });
      return {
        result: "verified" as const,
        waNumber: verification.member.waNumber,
      };
    });

    if (outcome.result === "invalid") {
      return Response.json(
        { data: null, error: { code: "INVALID_VERIFICATION_CODE", message: "Kode tidak ditemukan atau sudah kedaluwarsa." } },
        { status: 404 },
      );
    }
    if (outcome.result === "already_verified") {
      return Response.json(
        { data: null, error: { code: "ALREADY_VERIFIED", message: "Nomor ini sudah diverifikasi." } },
        { status: 409 },
      );
    }
    return Response.json({
      data: { verified: true, waNumber: maskWhatsAppNumber(outcome.waNumber) },
      error: null,
    });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    if (error instanceof ConfigurationError) {
      return Response.json(
        { data: null, error: { code: "SERVICE_UNAVAILABLE", message: "Rahasia verifikasi belum dikonfigurasi." } },
        { status: 503 },
      );
    }
    throw error;
  }
}
