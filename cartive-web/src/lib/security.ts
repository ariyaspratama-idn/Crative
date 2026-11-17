import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "cartive_session";
export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class DatabaseUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new ConfigurationError(
      "SESSION_SECRET belum diatur atau panjangnya kurang dari 32 karakter.",
    );
  }
  return secret;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashRateLimitKey(value: string, secret = getSessionSecret()) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function getRequestIp(request: NextRequest) {
  const cloudflareIp = request.headers.get("cf-connecting-ip");
  if (cloudflareIp) return cloudflareIp.trim();

  if (process.env.NODE_ENV !== "production") {
    return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  }

  return null;
}

export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;

  try {
    const originUrl = new URL(origin);
    const expectedHost = host.split(",")[0].trim().toLowerCase();
    const expectedProtocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
      new URL(request.url).protocol.replace(":", "");

    return (
      originUrl.host.toLowerCase() === expectedHost &&
      originUrl.protocol === `${expectedProtocol}:`
    );
  } catch {
    return false;
  }
}

export function databaseUnavailableResponse(error: unknown) {
  if (
    error instanceof DatabaseUnavailableError ||
    (error instanceof Error &&
      (error.name === "PrismaClientInitializationError" ||
        error.message.includes("Can't reach database server")))
  ) {
    return Response.json(
      {
        data: null,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message:
            "Layanan kartu belum siap karena konfigurasi basis data atau rahasia sesi belum lengkap.",
        },
      },
      { status: 503 },
    );
  }

  return null;
}

export function safeFileDigest(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
