import { describe, expect, it } from "vitest";
import { jakartaDayRange } from "./jakarta-date";

describe("jakartaDayRange", () => {
  it("menggunakan pergantian hari pukul 00.00 WIB", () => {
    const range = jakartaDayRange(new Date("2026-11-14T16:59:59.000Z"));
    expect(range.start.toISOString()).toBe("2026-11-13T17:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-11-14T17:00:00.000Z");
  });

  it("memindahkan batas hari sesudah tengah malam Jakarta", () => {
    const range = jakartaDayRange(new Date("2026-11-14T17:00:01.000Z"));
    expect(range.start.toISOString()).toBe("2026-11-14T17:00:00.000Z");
  });
});
