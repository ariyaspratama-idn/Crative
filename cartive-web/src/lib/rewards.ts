import { randomBytes } from "node:crypto";
import type { RewardType } from "@prisma/client";

const REWARD_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const REWARD_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export const rewardStampCosts: Record<RewardType, number> = {
  VOUCHER_2K: 3,
  FREE_BOTTLE: 7,
};

export const rewardLabels: Record<RewardType, string> = {
  VOUCHER_2K: "Voucher Rp2.000",
  FREE_BOTTLE: "1 botol gratis",
};

export function createRewardCode() {
  return Array.from(randomBytes(6), (value) => REWARD_CODE_ALPHABET[value & 31]).join("");
}
