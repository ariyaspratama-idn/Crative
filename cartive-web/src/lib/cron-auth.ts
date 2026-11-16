import { createHash, timingSafeEqual } from "node:crypto";

export function isAuthorizedCronRequest(headers: Headers, secret: string) {
  const authorization = headers.get("authorization");
  const match = authorization?.match(/^Bearer ([A-Za-z0-9._~-]+)$/);
  if (!match) return false;

  const expected = createHash("sha256").update(secret).digest();
  const provided = createHash("sha256").update(match[1]).digest();
  return timingSafeEqual(expected, provided);
}
