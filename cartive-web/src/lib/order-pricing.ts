export type OrderRewardType = "VOUCHER_2K" | "FREE_BOTTLE";

export function getRewardDiscount(
  rewardType: OrderRewardType,
  subtotal: number,
  freeBottlePrice?: number,
) {
  if (rewardType === "VOUCHER_2K") return Math.min(2000, subtotal);
  return freeBottlePrice ?? 0;
}

export function getPurchasedBottleCount(
  items: Array<{ quantity: number; isReward: boolean }>,
) {
  return items.reduce((count, item) => count + (item.isReward ? 0 : item.quantity), 0);
}

export function parseDailyOrderLimit(value: string | undefined) {
  if (value === undefined || value.trim() === "") return 20;
  if (!/^\d+$/.test(value.trim())) return null;
  const limit = Number(value);
  return Number.isSafeInteger(limit) && limit > 0 && limit <= 10000 ? limit : null;
}
