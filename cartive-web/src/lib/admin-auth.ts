import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "cartive_admin_session";
export const ADMIN_SESSION_LIFETIME_SECONDS = 8 * 60 * 60;

type AdminSettings = {
  allowedEmails: Set<string>;
  password: string;
  sessionSecret: string;
};

type AdminSession = {
  email: string;
  expiresAt: number;
};

export class AdminAuthConfigurationError extends Error {
  constructor() {
    super("Akses admin memerlukan kata sandi admin, secret sesi, dan daftar email admin.");
    this.name = "AdminAuthConfigurationError";
  }
}

function getLocalDevelopmentAdmin(headers: Headers) {
  if (process.env.NODE_ENV !== "development") return null;
  const host = headers.get("host")?.trim().toLowerCase();
  if (host && /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)) {
    return "local-dev@cartive.test";
  }
  return null;
}

function getAdminSettings(): AdminSettings {
  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const allowedEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  if (
    !password ||
    password.length < 16 ||
    password.length > 256 ||
    !sessionSecret ||
    sessionSecret.length < 32 ||
    allowedEmails.size === 0
  ) {
    throw new AdminAuthConfigurationError();
  }

  return { allowedEmails, password, sessionSecret };
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftDigest = createHmac("sha256", "cartive-admin-comparison").update(left).digest();
  const rightDigest = createHmac("sha256", "cartive-admin-comparison").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function readCookie(headers: Headers, cookieName: string) {
  const cookies = headers.get("cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator < 0 || cookie.slice(0, separator).trim() !== cookieName) continue;
    return cookie.slice(separator + 1).trim();
  }
  return null;
}

export function verifyAdminCredentials(email: string, password: string) {
  const settings = getAdminSettings();
  const normalizedEmail = email.trim().toLowerCase();
  const passwordMatches = safeEqual(password, settings.password);
  return settings.allowedEmails.has(normalizedEmail) && passwordMatches
    ? { email: normalizedEmail }
    : null;
}

export function createAdminSession(email: string) {
  const settings = getAdminSettings();
  const normalizedEmail = email.trim().toLowerCase();
  if (!settings.allowedEmails.has(normalizedEmail)) {
    throw new AdminAuthConfigurationError();
  }
  const session: AdminSession = {
    email: normalizedEmail,
    expiresAt: Math.floor(Date.now() / 1000) + ADMIN_SESSION_LIFETIME_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signature(payload, settings.sessionSecret)}`;
}

export async function getAdminIdentity(headers: Headers): Promise<string | null> {
  const localAdmin = getLocalDevelopmentAdmin(headers);
  if (localAdmin) return localAdmin;

  const settings = getAdminSettings();
  const token = readCookie(headers, ADMIN_SESSION_COOKIE);
  if (!token || token.length > 2048) return null;

  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra !== undefined) return null;
  if (!safeEqual(providedSignature, signature(payload, settings.sessionSecret))) return null;

  let session: AdminSession;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
  } catch {
    return null;
  }

  const email = typeof session.email === "string" ? session.email.trim().toLowerCase() : "";
  if (
    !email ||
    !settings.allowedEmails.has(email) ||
    !Number.isSafeInteger(session.expiresAt) ||
    session.expiresAt <= Math.floor(Date.now() / 1000)
  ) {
    return null;
  }
  return email;
}

export async function authorizeAdmin(headers: Headers) {
  try {
    const email = await getAdminIdentity(headers);
    if (email) return { email } as const;
    return {
      response: Response.json(
        { data: null, error: { code: "ADMIN_UNAUTHENTICATED", message: "Akses admin diperlukan." } },
        { status: 401 },
      ),
    } as const;
  } catch (error) {
    if (error instanceof AdminAuthConfigurationError) {
      return {
        response: Response.json(
          { data: null, error: { code: "ADMIN_AUTH_UNAVAILABLE", message: "Autentikasi admin belum dikonfigurasi." } },
          { status: 503 },
        ),
      } as const;
    }
    throw error;
  }
}
