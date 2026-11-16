import { Platform } from "@prisma/client";

const shortCodePattern = /^(?:#\d{1,4}|GF-\d{1,5})$/i;
const orderPatterns: Record<Platform, RegExp> = {
  SHOPEEFOOD: /^\d{16,20}$/,
  GOFOOD: /^F-\d{10,14}$/i,
  GRABFOOD: /^A-[A-Z0-9]{12}$/i,
};
export const MAX_CLAIM_AGE_MS = 48 * 60 * 60 * 1000;
const JAKARTA_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

export function parseJakartaDateTimeLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const [year, month, day, hour, minute] = [
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
  ].map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }

  return new Date(calendar.getTime() - JAKARTA_UTC_OFFSET_MS);
}

export function getClaimWindowError(orderedAt: Date, now: Date) {
  if (orderedAt.getTime() > now.getTime() + 5 * 60 * 1000) return "FUTURE_ORDER";
  if (now.getTime() - orderedAt.getTime() > MAX_CLAIM_AGE_MS) return "CLAIM_WINDOW_EXPIRED";
  return null;
}

export function normalizeOrderId(orderId: string) {
  return orderId.trim().replace(/\s+/g, "").toUpperCase();
}

export function isShortOrderCode(orderId: string) {
  return shortCodePattern.test(orderId);
}

export function isValidOrderId(platform: Platform, orderId: string) {
  return orderPatterns[platform].test(orderId);
}
