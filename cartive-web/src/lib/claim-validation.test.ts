import { describe, expect, it } from "vitest";
import { Platform } from "@prisma/client";
import {
  isShortOrderCode,
  isValidOrderId,
  getClaimWindowError,
  normalizeOrderId,
  parseJakartaDateTimeLocal,
} from "./claim-validation";

describe("validasi order ID awal", () => {
  it("menormalkan spasi dan huruf", () => {
    expect(normalizeOrderId(" f-1234567890 ")).toBe("F-1234567890");
  });

  it.each([
    [Platform.SHOPEEFOOD, "123456789012345678"],
    [Platform.GOFOOD, "F-1234567890"],
    [Platform.GRABFOOD, "A-ABC123DEF456"],
  ] as const)("menerima pola awal %s", (platform, orderId) => {
    expect(isValidOrderId(platform, orderId)).toBe(true);
  });

  it("mengidentifikasi kode antrean, bukan order ID", () => {
    expect(isShortOrderCode("#82")).toBe(true);
    expect(isShortOrderCode("GF-717")).toBe(true);
    expect(isValidOrderId(Platform.GRABFOOD, "GF-717")).toBe(false);
  });

  it("menolak format ID yang tidak cocok dengan platform", () => {
    expect(isValidOrderId(Platform.GOFOOD, "123456789012345678")).toBe(false);
  });

  it("mengubah waktu lokal WIB menjadi UTC dengan benar", () => {
    expect(parseJakartaDateTimeLocal("2026-11-15T08:30")?.toISOString())
      .toBe("2026-11-15T01:30:00.000Z");
  });

  it("menolak waktu kalender yang tidak valid", () => {
    expect(parseJakartaDateTimeLocal("2026-02-30T08:30")).toBeNull();
    expect(parseJakartaDateTimeLocal("2026-11-15T24:00")).toBeNull();
  });

  it("menerapkan batas 48 jam dan menolak tanggal masa depan", () => {
    const now = new Date("2026-11-15T01:00:00.000Z");
    expect(getClaimWindowError(new Date(now.getTime() - 48 * 60 * 60 * 1000), now)).toBeNull();
    expect(getClaimWindowError(new Date(now.getTime() - 48 * 60 * 60 * 1000 - 1), now))
      .toBe("CLAIM_WINDOW_EXPIRED");
    expect(getClaimWindowError(new Date(now.getTime() + 6 * 60 * 1000), now))
      .toBe("FUTURE_ORDER");
  });
});
