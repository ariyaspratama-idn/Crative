import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminIdentity } from "./admin-auth";

const issuer = "https://cartive.cloudflareaccess.com";
const audience = "cartive-admin-app";
const allowedEmail = "admin@example.com";
const keyId = "cartive-test-key";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = {
  ...publicKey.export({ format: "jwk" }),
  kid: keyId,
  alg: "RS256",
};

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function makeToken(claimOverrides: Record<string, unknown> = {}) {
  const header = encode({ alg: "RS256", typ: "JWT", kid: keyId });
  const now = Math.floor(Date.now() / 1000);
  const claims = encode({
    iss: issuer,
    aud: audience,
    email: allowedEmail,
    iat: now,
    exp: now + 60,
    ...claimOverrides,
  });
  const signingInput = `${header}.${claims}`;
  const signature = sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString(
    "base64url",
  );
  return `${signingInput}.${signature}`;
}

describe("getAdminIdentity", () => {
  beforeEach(() => {
    vi.stubEnv("CLOUDFLARE_ACCESS_TEAM_DOMAIN", "cartive.cloudflareaccess.com");
    vi.stubEnv("CLOUDFLARE_ACCESS_AUD", audience);
    vi.stubEnv("ADMIN_EMAILS", ` ${allowedEmail.toUpperCase()},other@example.com `);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ keys: [jwk] }, { status: 200 }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("verifies the signature and returns an allowlisted email", async () => {
    const identity = await getAdminIdentity(
      new Headers({ "cf-access-jwt-assertion": makeToken() }),
    );
    expect(identity).toBe(allowedEmail);
  });

  it.each([
    ["expired", { exp: Math.floor(Date.now() / 1000) - 1 }],
    ["wrong issuer", { iss: "https://other.cloudflareaccess.com" }],
    ["wrong audience", { aud: "another-app" }],
    ["unlisted email", { email: "someone@example.com" }],
  ])("rejects a token with %s", async (_label, claims) => {
    const identity = await getAdminIdentity(
      new Headers({ "cf-access-jwt-assertion": makeToken(claims) }),
    );
    expect(identity).toBeNull();
  });

  it("rejects a signature that has been changed", async () => {
    const token = makeToken();
    const tampered = `${token.slice(0, token.lastIndexOf(".") + 1)}invalid`;
    const identity = await getAdminIdentity(
      new Headers({ "cf-access-jwt-assertion": tampered }),
    );
    expect(identity).toBeNull();
  });

  it("rejects requests without an Access assertion", async () => {
    expect(await getAdminIdentity(new Headers())).toBeNull();
  });

  it("allows local admin only on a loopback development host", async () => {
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
