import "server-only";

import { getDb } from "@/lib/db";
import { jakartaDayRange } from "@/lib/jakarta-date";
import { hashRateLimitKey } from "@/lib/security";

export async function consumeRateLimit(
  name: string,
  identifier: string,
  windowMs: number,
  maximum: number,
) {
  const db = getDb();
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const key = hashRateLimitKey(`${name}:${identifier}`);
  const bucket = await db.rateLimitBucket.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  return {
    allowed: bucket.count <= maximum,
    remaining: Math.max(0, maximum - bucket.count),
    resetAt: new Date(windowStart.getTime() + windowMs),
  };
}

export async function consumeDailyRateLimit(
  name: string,
  identifier: string,
  maximum: number,
) {
  const db = getDb();
  const { start, end } = jakartaDayRange();
  const key = hashRateLimitKey(`${name}:${identifier}`);
  const bucket = await db.rateLimitBucket.upsert({
    where: { key_windowStart: { key, windowStart: start } },
    create: { key, windowStart: start, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  return {
    allowed: bucket.count <= maximum,
    remaining: Math.max(0, maximum - bucket.count),
    resetAt: end,
  };
}
