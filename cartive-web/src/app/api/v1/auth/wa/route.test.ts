import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/phone", () => ({
  normalizeWhatsAppNumber: vi.fn((value: string) => value),
}));
vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: vi.fn(),
}));
vi.mock("@/lib/security", () => ({
  ConfigurationError: class ConfigurationError extends Error {},
  databaseUnavailableResponse: vi.fn(() => null),
  getRequestIp: vi.fn(() => "192.0.2.1"),
  getSessionSecret: vi.fn(() => "a".repeat(32)),
  hashRateLimitKey: vi.fn((value: string) => value),
  isSameOrigin: vi.fn(() => true),
}));
vi.mock("@/lib/whatsapp-login", () => ({
  createLoginCode: vi.fn(() => "ABC234"),
  hashLoginCode: vi.fn(() => "hashed"),
  sendWhatsAppLoginCode: vi.fn(),
  WhatsAppDeliveryError: class WhatsAppDeliveryError extends Error {},
  WhatsAppLoginConfigurationError: class WhatsAppLoginConfigurationError extends Error {},
}));

describe("POST /api/v1/auth/wa", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function makeRequest(payload: Record<string, unknown>) {
    return new NextRequest("http://localhost/api/v1/auth/wa", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        waNumber: "628123456789",
        consentPrivacy: true,
        ...payload,
      }),
    });
  }

  it("rejects a filled honeypot before accessing login services", async () => {
    const response = await POST(makeRequest({ website: "https://spam.example" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "BOT_CHECK_FAILED" },
    });
    expect(consumeRateLimit).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it("fails closed in production when Turnstile credentials are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(makeRequest({}));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "TURNSTILE_UNAVAILABLE" },
    });
    expect(consumeRateLimit).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it("rejects an invalid production Turnstile token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "configured-test-secret");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: false })));

    const response = await POST(makeRequest({ turnstileToken: "invalid-token" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "BOT_CHECK_FAILED" },
    });
    expect(getDb).not.toHaveBeenCalled();
  });
});
