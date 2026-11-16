import { describe, expect, it } from "vitest";
import { maskWhatsAppNumber, normalizeWhatsAppNumber } from "./phone";

describe("normalizeWhatsAppNumber", () => {
  it.each([
    ["0812-3456-7890", "6281234567890"],
    ["+62 812 3456 7890", "6281234567890"],
    ["81234567890", "6281234567890"],
    ["6281234567890", "6281234567890"],
  ])("mengubah %s ke format E.164 lokal", (input, expected) => {
    expect(normalizeWhatsAppNumber(input)).toBe(expected);
  });

  it("menolak nomor yang terlalu pendek", () => {
    expect(() => normalizeWhatsAppNumber("0812")).toThrow("Nomor WhatsApp tidak valid.");
  });
});

describe("maskWhatsAppNumber", () => {
  it("menyamarkan digit tengah", () => {
    expect(maskWhatsAppNumber("6281234567890")).toBe("+6281 **** 7890");
  });
});
