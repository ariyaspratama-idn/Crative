import { describe, expect, it } from "vitest";
import { getTrustedRequestIp } from "./request-ip";

describe("getTrustedRequestIp", () => {
  it("uses the trusted Vercel client-IP header without requiring Cloudflare", () => {
    expect(
      getTrustedRequestIp(
        new Headers({ "x-vercel-forwarded-for": "203.0.113.8" }),
        { vercel: "1", nodeEnv: "production" },
      ),
    ).toBe("203.0.113.8");
  });

  it("does not fall back to caller-controlled forwarded headers on Vercel", () => {
    expect(
      getTrustedRequestIp(
        new Headers({
          "x-forwarded-for": "203.0.113.8",
          "cf-connecting-ip": "203.0.113.9",
        }),
        { vercel: "1", nodeEnv: "production" },
      ),
    ).toBeNull();
    expect(
      getTrustedRequestIp(
        new Headers({ "x-vercel-forwarded-for": "203.0.113.8, 198.51.100.4" }),
        { vercel: "1", nodeEnv: "production" },
      ),
    ).toBeNull();
  });

  it("accepts a valid Cloudflare client IP on non-Vercel production", () => {
    expect(
      getTrustedRequestIp(
        new Headers({ "cf-connecting-ip": "2001:db8::8" }),
        { nodeEnv: "production" },
      ),
    ).toBe("2001:db8::8");
    expect(
      getTrustedRequestIp(
        new Headers({ "x-forwarded-for": "203.0.113.8" }),
        { nodeEnv: "production" },
      ),
    ).toBeNull();
  });

  it("uses a valid forwarded IP locally and otherwise returns the local bucket", () => {
    expect(
      getTrustedRequestIp(
        new Headers({ "x-forwarded-for": "203.0.113.8, 10.0.0.2" }),
        { nodeEnv: "development" },
      ),
    ).toBe("203.0.113.8");
    expect(
      getTrustedRequestIp(
        new Headers({ "x-forwarded-for": "not-an-ip" }),
        { nodeEnv: "development" },
      ),
    ).toBe("local");
  });
});
