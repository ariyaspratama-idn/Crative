import { createPublicKey, verify as verifySignature } from "node:crypto";

type CloudflareJwk = {
  kid: string;
  kty: string;
  alg?: string;
  n: string;
  e: string;
};

type AdminSettings = {
  teamDomain: string;
  audience: string;
  allowedEmails: Set<string>;
};

type AccessClaims = {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iss?: string;
  nbf?: number;
  iat?: number;
};

type CachedKeys = {
  teamDomain: string;
  expiresAt: number;
  keys: CloudflareJwk[];
};

let cachedKeys: CachedKeys | undefined;

function getLocalDevelopmentAdmin(headers: Headers) {
  if (process.env.NODE_ENV !== "development") return null;
  const host = headers.get("host")?.trim().toLowerCase();
  if (host && /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)) {
    return "local-dev@cartive.test";
  }
  return null;
}

export class AdminAuthUnavailableError extends Error {
  constructor() {
    super("Verifikasi akses admin sementara tidak tersedia.");
    this.name = "AdminAuthUnavailableError";
  }
}

export class AdminAuthConfigurationError extends Error {
  constructor() {
    super("Akses admin memerlukan domain, audience Cloudflare Access, dan daftar email admin.");
    this.name = "AdminAuthConfigurationError";
  }
}

function getAdminSettings(): AdminSettings {
  const teamDomain = process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN?.trim().toLowerCase();
  const audience = process.env.CLOUDFLARE_ACCESS_AUD?.trim();
  const allowedEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  if (
    !teamDomain ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(teamDomain) ||
    !audience ||
    allowedEmails.size === 0
  ) {
    throw new AdminAuthConfigurationError();
  }

  return { teamDomain, audience, allowedEmails };
}

function decodeSegment<T>(segment: string): T | null {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) return null;
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

async function getCloudflareKeys(teamDomain: string) {
  if (
    cachedKeys?.teamDomain === teamDomain &&
    cachedKeys.expiresAt > Date.now()
  ) {
    return cachedKeys.keys;
  }

  let response: Response;
  try {
    response = await fetch(
      `https://${teamDomain}/cdn-cgi/access/certs`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
  } catch {
    throw new AdminAuthUnavailableError();
  }

  if (!response.ok) throw new AdminAuthUnavailableError();

  let body: { keys?: unknown };
  try {
    body = (await response.json()) as { keys?: CloudflareJwk[] };
  } catch {
    throw new AdminAuthUnavailableError();
  }

  const keys = Array.isArray(body.keys)
    ? body.keys.filter(
        (key): key is CloudflareJwk =>
          typeof key === "object" &&
          key !== null &&
      typeof key.kid === "string" &&
      key.kty === "RSA" &&
      typeof key.n === "string" &&
      typeof key.e === "string" &&
      (!key.alg || key.alg === "RS256"),
      )
    : [];
  if (!keys?.length) throw new AdminAuthUnavailableError();

  cachedKeys = {
    teamDomain,
    keys,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  return keys;
}

export async function getAdminIdentity(headers: Headers): Promise<string | null> {
  const localAdmin = getLocalDevelopmentAdmin(headers);
  if (localAdmin) return localAdmin;

  const settings = getAdminSettings();
  const token = headers.get("cf-access-jwt-assertion");
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = decodeSegment<{ alg?: string; kid?: string }>(parts[0]);
  const claims = decodeSegment<AccessClaims>(parts[1]);
  if (!header || !claims || header.alg !== "RS256" || !header.kid) return null;

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (
    claims.iss !== `https://${settings.teamDomain}` ||
    !audiences.includes(settings.audience) ||
    typeof claims.exp !== "number" ||
    claims.exp <= now ||
    (typeof claims.nbf === "number" && claims.nbf > now + 60) ||
    (typeof claims.iat === "number" && claims.iat > now + 60)
  ) {
    return null;
  }

  const email = claims.email?.trim().toLowerCase();
  if (!email || !settings.allowedEmails.has(email)) return null;

  const key = (await getCloudflareKeys(settings.teamDomain)).find(
    (candidate) => candidate.kid === header.kid,
  );
  if (!key) return null;

  let validSignature = false;
  try {
    validSignature = verifySignature(
      "RSA-SHA256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      createPublicKey({ key, format: "jwk" }),
      Buffer.from(parts[2], "base64url"),
    );
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }

  return validSignature ? email : null;
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
    if (
      error instanceof AdminAuthConfigurationError ||
      error instanceof AdminAuthUnavailableError
    ) {
      return {
        response: Response.json(
          { data: null, error: { code: "ADMIN_AUTH_UNAVAILABLE", message: "Akses admin belum dikonfigurasi atau sementara tidak tersedia." } },
          { status: 503 },
        ),
      } as const;
    }
    throw error;
  }
}
