import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { getCurrentMember } from "@/lib/member-session";
import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/external-notifications", () => ({
  sendAdminAlert: vi.fn(async () => undefined),
}));
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/member-session", () => ({
  getCurrentMember: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  consumeDailyRateLimit: vi.fn(),
}));
vi.mock("@/lib/jakarta-date", () => ({
  jakartaDayRange: vi.fn(),
}));
vi.mock("@/lib/receipt-processing", () => ({
  processReceiptImage: vi.fn(),
  ReceiptImageError: class ReceiptImageError extends Error {},
}));
vi.mock("@/lib/receipt-storage", () => ({
  deletePrivateReceipt: vi.fn(),
  disposeStorageClient: vi.fn(),
  storePrivateReceipt: vi.fn(),
}));
vi.mock("@/lib/security", () => ({
  ConfigurationError: class ConfigurationError extends Error {},
  databaseUnavailableResponse: vi.fn(() => null),
  getRequestIp: vi.fn(() => "192.0.2.1"),
  isSameOrigin: vi.fn(() => true),
  safeFileDigest: vi.fn(),
}));

describe("POST /api/v1/claims anti-bot controls", () => {
  const claim = { count: vi.fn() };

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.clearAllMocks();
    vi.mocked(getCurrentMember).mockResolvedValue({ id: "member_1" } as never);
    vi.mocked(getDb).mockReturnValue({ claim } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function makeRequest(fields: Record<string, string>) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    return new NextRequest("http://localhost/api/v1/claims", {
      method: "POST",
      headers: { origin: "http://localhost" },
      body: form,
    });
  }

  it("rejects a filled honeypot before claim validation or storage access", async () => {
    const response = await POST(makeRequest({ website: "https://spam.example" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "BOT_CHECK_FAILED" },
    });
    expect(claim.count).not.toHaveBeenCalled();
  });

  it("requires a configured Turnstile secret in production before claim processing", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(makeRequest({}));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "TURNSTILE_UNAVAILABLE" },
    });
    expect(claim.count).not.toHaveBeenCalled();
  });
});
