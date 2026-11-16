import { describe, expect, it } from "vitest";
import {
  getPurchasedBottleCount,
  getRewardDiscount,
  parseDailyOrderLimit,
} from "./order-pricing";

describe("web order pricing", () => {
  it("applies the voucher amount without exceeding the order subtotal", () => {
    expect(getRewardDiscount("VOUCHER_2K", 30000)).toBe(2000);
    expect(getRewardDiscount("VOUCHER_2K", 1000)).toBe(1000);
  });

  it("uses the chosen product price as the free-bottle discount", () => {
    expect(getRewardDiscount("FREE_BOTTLE", 20000, 10000)).toBe(10000);
  });

  it("does not award purchase stamps for reward bottles", () => {
    expect(getPurchasedBottleCount([
      { quantity: 2, isReward: false },
      { quantity: 1, isReward: true },
    ])).toBe(2);
  });

  it("defaults the daily order limit to 20 and rejects invalid settings", () => {
    expect(parseDailyOrderLimit(undefined)).toBe(20);
    expect(parseDailyOrderLimit("35")).toBe(35);
    expect(parseDailyOrderLimit("0")).toBeNull();
    expect(parseDailyOrderLimit("many")).toBeNull();
  });
});
