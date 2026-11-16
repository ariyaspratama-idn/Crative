import { describe, expect, it } from "vitest";
import { getManualOrderSubtotal, buildManualOrderMessage } from "./manual-order";
import { products } from "./catalog";

describe("pesanan manual via WhatsApp", () => {
  it("menghitung subtotal dari katalog server", () => {
    expect(
      getManualOrderSubtotal([
        { product: products[0], quantity: 2 },
        { product: products[4], quantity: 1 },
      ]),
    ).toBe(30000);
  });

  it("menyertakan alamat hanya untuk pengiriman dan meminta bukti bayar di chat", () => {
    const message = buildManualOrderMessage({
      customerName: "Dina",
      fulfillment: "DELIVERY",
      address: "Jalan Melati 10",
      items: [{ product: products[0], quantity: 1 }],
    });
    expect(message).toContain("Alamat: Jalan Melati 10");
    expect(message).toContain("bukti pembayaran sebagai lampiran di chat ini");
    expect(message).toContain("belum dikonfirmasi");
  });

  it("tidak menyertakan alamat pada pesanan ambil di tempat", () => {
    const message = buildManualOrderMessage({
      customerName: "Dina",
      fulfillment: "PICKUP",
      items: [{ product: products[1], quantity: 1 }],
    });
    expect(message).toContain("Metode: Ambil di tempat");
    expect(message).not.toContain("Alamat:");
  });
});
