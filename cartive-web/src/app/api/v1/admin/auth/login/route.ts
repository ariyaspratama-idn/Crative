import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_LIFETIME_SECONDS,
  AdminAuthConfigurationError,
  createAdminSession,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { ConfigurationError, databaseUnavailableResponse, isSameOrigin } from "@/lib/security";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
}).strict();

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
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
      { data: null, error: { code: "INVALID_INPUT", message: "Masukkan email dan kata sandi yang valid." } },
      { status: 400 },
    );
  }

  try {
    const rateLimit = await consumeRateLimit(
      "admin-login",
      parsed.data.email.trim().toLowerCase(),
      15 * 60 * 1000,
      5,
    );
    if (!rateLimit.allowed) {
      return Response.json(
        { data: null, error: { code: "RATE_LIMITED", message: "Terlalu banyak percobaan. Coba lagi beberapa saat." } },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)) } },
      );
    }

    const credentials = verifyAdminCredentials(parsed.data.email, parsed.data.password);
    if (!credentials) {
      return Response.json(
        { data: null, error: { code: "INVALID_CREDENTIALS", message: "Email atau kata sandi tidak cocok." } },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ data: { email: credentials.email }, error: null });
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(credentials.email), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_LIFETIME_SECONDS,
    });
    return response;
  } catch (error) {
    if (error instanceof AdminAuthConfigurationError || error instanceof ConfigurationError) {
      return Response.json(
        { data: null, error: { code: "ADMIN_AUTH_UNAVAILABLE", message: "Autentikasi admin belum dikonfigurasi lengkap." } },
        { status: 503 },
      );
    }
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
