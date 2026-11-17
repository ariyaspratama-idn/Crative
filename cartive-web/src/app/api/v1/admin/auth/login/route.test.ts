import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeRateLimit } from "@/lib/rate-limit";
import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: vi.fn(async () => ({
    allowed: true,
    resetAt: new Date(Date.now() + 60_000),
  })),
}));
vi.mock("@/lib/security", () => ({
  databaseUnavailableResponse: vi.fn(() => null),
  isSameOrigin: vi.fn(() => true),
}));

describe("POST /api/v1/admin/auth/login", () => {
  const adminSecret = "admin-session-secret-with-at-least-32-characters";

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    vi.stubEnv("ADMIN_PASSWORD", "long-unique-admin-password");
    vi.stubEnv("ADMIN_SESSION_SECRET", adminSecret);
    vi.stubEnv("SESSION_SECRET", "");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows login with admin secrets without requiring the member SESSION_SECRET", async () => {
    const request = new NextRequest("https://cartive.example/api/v1/admin/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "long-unique-admin-password",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("cartive_admin_session=");
    expect(consumeRateLimit).toHaveBeenCalledWith(
      "admin-login",
      "admin@example.com",
      15 * 60 * 1000,
      5,
      adminSecret,
    );
  });
});
