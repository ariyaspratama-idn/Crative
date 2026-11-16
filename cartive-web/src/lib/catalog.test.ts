import { describe, expect, it } from "vitest";
import { getProduct, products } from "./catalog";

describe("catalog", () => {
  it("contains six products split evenly across Reka and Sela", () => {
    expect(products).toHaveLength(6);
    expect(products.filter((product) => product.line === "Reka")).toHaveLength(3);
    expect(products.filter((product) => product.line === "Sela")).toHaveLength(3);
  });

  it("resolves product details by stable slug and rejects unknown products", () => {
    expect(getProduct("reka-classic")?.name).toBe("Reka Classic");
    expect(getProduct("unknown-product")).toBeUndefined();
  });
});
