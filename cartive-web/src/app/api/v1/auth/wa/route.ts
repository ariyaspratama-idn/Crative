import { z } from "zod";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { normalizeWhatsAppNumber } from "@/lib/phone";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  ConfigurationError,
  databaseUnavailableResponse,
  getRequestIp,
  getSessionSecret,
  hashRateLimitKey,
  isSameOrigin,
} from "@/lib/security";
import {
  createLoginCode,
  hashLoginCode,
  sendWhatsAppLoginCode,
  WhatsAppDeliveryError,
  WhatsAppLoginConfigurationError,
} from "@/lib/whatsapp-login";
import { turnstileFailureResponse, verifyTurnstileToken } from "@/lib/turnstile";

const CODE_LIFETIME_MS = 10 * 60 * 1000;

const loginSchema = z.object({
  waNumber: z.string().min(1).max(40),
  consentPrivacy: z.literal(true),
  consentPromo: z.boolean().default(false),
  turnstileToken: z.string().max(2048).default(""),
  website: z.string().max(200).default(""),
}).strict();

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
      { data: null, error: { code: "INVALID_JSON", message: "Data permintaan tidak terbaca." } },
      { status: 400 },
    );
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Periksa kembali data yang diisi." } },
      { status: 400 },
    );
  }
  if (parsed.data.website.trim()) {
    return Response.json(
      { data: null, error: { code: "BOT_CHECK_FAILED", message: "Permintaan tidak dapat diproses." } },
      { status: 400 },
    );
  }
  const botCheck = await verifyTurnstileToken(parsed.data.turnstileToken, "login");
  if (!botCheck.valid) return turnstileFailureResponse(botCheck.unavailable);

  let waNumber: string;
  let sessionSecret: string;
  try {
    waNumber = normalizeWhatsAppNumber(parsed.data.waNumber);
    sessionSecret = getSessionSecret();
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return Response.json(
        { data: null, error: { code: "SERVICE_UNAVAILABLE", message: error.message } },
        { status: 503 },
      );
    }
    return Response.json(
      { data: null, error: { code: "INVALID_WA", message: "Nomor WhatsApp tidak valid." } },
      { status: 400 },
    );
  }

  try {
    const ipLimit = await consumeRateLimit("wa-login-ip", ip, 10 * 60 * 1000, 5);
    const numberLimit = await consumeRateLimit(
      "wa-login-number",
      hashRateLimitKey(waNumber),
      60 * 60 * 1000,
      3,
    );
    if (!ipLimit.allowed || !numberLimit.allowed) {
      const resetAt = new Date(Math.max(ipLimit.resetAt.getTime(), numberLimit.resetAt.getTime()));
      return Response.json(
        { data: null, error: { code: "RATE_LIMITED", message: "Terlalu banyak permintaan kode. Coba lagi setelah beberapa saat." } },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt.getTime() - Date.now()) / 1000)) } },
      );
    }

    const code = createLoginCode();
    const codeHash = hashLoginCode(waNumber, code, sessionSecret);
    const now = new Date();
    const challenge = await getDb().loginChallenge.create({
      data: {
        waNumber,
        codeHash,
        consentPromo: parsed.data.consentPromo,
        requestedAt: now,
        expiresAt: new Date(now.getTime() + CODE_LIFETIME_MS),
      },
      select: { id: true },
    });

    try {
      await sendWhatsAppLoginCode(waNumber, code);
    } catch (error) {
      if (error instanceof WhatsAppLoginConfigurationError) {
        if (
          process.env.NODE_ENV === "development" &&
          ["localhost", "127.0.0.1", "::1"].includes(request.nextUrl.hostname.toLowerCase())
        ) {
          return Response.json(
            {
              data: {
                challengeId: challenge.id,
                codeSent: true,
                expiresAt: new Date(now.getTime() + CODE_LIFETIME_MS),
                developmentCode: code,
              },
              error: null,
            },
            { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
          );
        }
        await getDb().loginChallenge.deleteMany({ where: { id: challenge.id, codeHash } });
        return Response.json(
          { data: null, error: { code: "LOGIN_CHANNEL_UNAVAILABLE", message: "Login WhatsApp belum dikonfigurasi untuk mengirim kode dengan aman." } },
          { status: 503 },
        );
      }
      await getDb().loginChallenge.deleteMany({ where: { id: challenge.id, codeHash } });
      if (error instanceof WhatsAppDeliveryError) {
        return Response.json(
          { data: null, error: { code: "LOGIN_CODE_DELIVERY_FAILED", message: "Kode masuk belum dapat dikirim. Coba lagi nanti." } },
          { status: 503 },
        );
      }
      throw error;
    }

    return Response.json(
      { data: { challengeId: challenge.id, codeSent: true, expiresAt: new Date(now.getTime() + CODE_LIFETIME_MS) }, error: null },
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
