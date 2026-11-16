import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";

describe("robots metadata for public staging deployments", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks indexing for a staging deployment", () => {
    vi.stubEnv("CARTIVE_DEPLOYMENT_ENV", "staging");
    vi.stubEnv("VERCEL_ENV", "");

    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("blocks indexing for Vercel preview deployments", () => {
    vi.stubEnv("CARTIVE_DEPLOYMENT_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");

    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("keeps the existing public crawl rules for production", () => {
    vi.stubEnv("CARTIVE_DEPLOYMENT_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://cartive.example");

    expect(robots().rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/kartu", "/profil", "/pesanan", "/keranjang", "/checkout"],
    });
  });
});
