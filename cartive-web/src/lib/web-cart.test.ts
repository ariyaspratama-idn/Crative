import { describe, expect, it } from "vitest";
import { getCartSubtotal, normalizeCart } from "./web-cart";

describe("web cart", () => {
  it("keeps valid custom product slugs and combines duplicate quantities within the limit", () => {
    expect(normalizeCart([
      { productId: "reka-classic", quantity: 2 },
      { productId: "reka-classic", quantity: 4 },
      { productId: "kopi-liberika", quantity: 1 },
      { productId: "../invalid", quantity: 1 },
      { productId: "sela-ice-creamy", quantity: "3" },
    ])).toEqual([
      { productId: "reka-classic", quantity: 6 },
      { productId: "kopi-liberika", quantity: 1 },
    ]);
  });

  it("calculates subtotals from the trusted catalog prices", () => {
    const items = normalizeCart([
      { productId: "reka-classic", quantity: 2 },
      { productId: "sela-ice-creamy", quantity: 1 },
    ]);
    expect(getCartSubtotal(items)).toBe(30000);
  });

  it("uses current configured catalog prices when calculating the cart", () => {
    const items = normalizeCart([
      { productId: "reka-classic", quantity: 2 },
      { productId: "sela-ice-creamy", quantity: 1 },
    ]);
    const prices = new Map([
      ["reka-classic", 12500],
      ["sela-ice-creamy", 11000],
    ]);
    expect(getCartSubtotal(items, prices)).toBe(36000);
  });
});
