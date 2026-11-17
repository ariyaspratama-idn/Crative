import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  ADMIN_SESSION_COOKIE,
  AdminAuthConfigurationError,
  createAdminSession,
  getAdminIdentity,
  verifyAdminCredentials,
} from "./admin-auth";

const email = "admin@example.com";
const password = "a-strong-admin-password";
const sessionSecret = "test-admin-session-secret-with-more-than-32-characters";

function makeCookie(token: string) {
  return new Headers({ cookie: `${ADMIN_SESSION_COOKIE}=${token}` });
}

function signPayload(payload: object, secret = sessionSecret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

describe("admin authentication", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", ` ${email.toUpperCase()},other@example.com `);
    vi.stubEnv("ADMIN_PASSWORD", password);
    vi.stubEnv("ADMIN_SESSION_SECRET", sessionSecret);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts only a valid password for an allowlisted email", () => {
    expect(verifyAdminCredentials(email.toUpperCase(), password)).toEqual({ email });
    expect(verifyAdminCredentials("other@example.com", "wrong-password")).toBeNull();
    expect(verifyAdminCredentials("unlisted@example.com", password)).toBeNull();
  });

  it("requires complete admin configuration", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(() => verifyAdminCredentials(email, password)).toThrow(AdminAuthConfigurationError);
  });

  it("accepts a signed session cookie for an allowlisted admin", async () => {
    const token = createAdminSession(email);
    expect(await getAdminIdentity(makeCookie(token))).toBe(email);
  });

  it("rejects a tampered session and a session signed by another secret", async () => {
    const token = createAdminSession(email);
    const [payload, signature] = token.split(".");
    const tampered = `${payload}.${signature.slice(0, -1)}x`;
    expect(await getAdminIdentity(makeCookie(tampered))).toBeNull();
    const wrongSecret = signPayload({
      email,
      expiresAt: Math.floor(Date.now() / 1000) + 60,
    }, "wrong-secret-with-sufficient-length");
    expect(await getAdminIdentity(makeCookie(wrongSecret))).toBeNull();
  });

  it("rejects expired and no-longer-allowlisted sessions", async () => {
    const expired = signPayload({ email, expiresAt: Math.floor(Date.now() / 1000) - 1 });
    expect(await getAdminIdentity(makeCookie(expired))).toBeNull();

    const active = createAdminSession(email);
    vi.stubEnv("ADMIN_EMAILS", "other@example.com");
    expect(await getAdminIdentity(makeCookie(active))).toBeNull();
  });

  it("permits local admin only on a loopback development host", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(await getAdminIdentity(new Headers({ host: "localhost:3000" })))
      .toBe("local-dev@cartive.test");
    expect(await getAdminIdentity(new Headers({ host: "192.168.1.20:3000" })))
      .toBeNull();
  });

  it("never enables local admin in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await getAdminIdentity(new Headers({ host: "localhost:3000" })))
      .toBeNull();
  });
});
