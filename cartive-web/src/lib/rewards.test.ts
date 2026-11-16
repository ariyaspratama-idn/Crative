import { describe, expect, it } from "vitest";
import {
  createRewardCode,
  rewardLabels,
  rewardStampCosts,
  REWARD_LIFETIME_MS,
} from "./rewards";

describe("aturan reward Fuel Card", () => {
  it("menggunakan biaya stamp sesuai program", () => {
    expect(rewardStampCosts).toEqual({ VOUCHER_2K: 3, FREE_BOTTLE: 7 });
  });

  it("menyediakan nama hadiah yang ditampilkan", () => {
    expect(rewardLabels).toEqual({
      VOUCHER_2K: "Voucher Rp2.000",
      FREE_BOTTLE: "1 botol gratis",
    });
  });

  it("menghasilkan kode enam karakter tanpa karakter yang mudah tertukar", () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const code = createRewardCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });

  it("menetapkan masa berlaku tujuh hari", () => {
    expect(REWARD_LIFETIME_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
