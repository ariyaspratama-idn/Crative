import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "./turnstile";

vi.mock("server-only", () => ({}));

describe("Cloudflare Turnstile verification", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("allows local development without external credentials", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    await expect(verifyTurnstileToken("", "login")).resolves.toEqual({ valid: true });
  });

  it("fails closed in production when the secret is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    await expect(verifyTurnstileToken("token", "claim")).resolves.toEqual({
      valid: false,
      unavailable: true,
    });
  });

  it("rejects a missing or oversized production token without calling Siteverify", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyTurnstileToken("", "login")).resolves.toEqual({
      valid: false,
      unavailable: false,
    });
    await expect(verifyTurnstileToken("x".repeat(2049), "login")).resolves.toEqual({
      valid: false,
      unavailable: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts only successful responses for the expected action", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = new URLSearchParams(String(init?.body));
      expect(body.get("secret")).toBe("test-secret");
      expect(body.get("response")).toBe("valid-token");
      return Response.json({ success: true, action: "claim" });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyTurnstileToken("valid-token", "claim")).resolves.toEqual({ valid: true });
    await expect(verifyTurnstileToken("valid-token", "login")).resolves.toEqual({
      valid: false,
      unavailable: false,
    });
  });

  it("distinguishes a rejected token from a verification-service outage", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ success: false }))
      .mockRejectedValueOnce(new Error("network unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyTurnstileToken("invalid-token", "login")).resolves.toEqual({
      valid: false,
      unavailable: false,
    });
    await expect(verifyTurnstileToken("valid-token", "login")).resolves.toEqual({
      valid: false,
      unavailable: true,
    });
  });
});
