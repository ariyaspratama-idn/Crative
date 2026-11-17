import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getCatalogProducts } from "./catalog-settings";

describe("getCatalogProducts", () => {
  const customProduct = {
    id: "kopi-liberika",
    name: "Kopi Liberika",
    line: "Eksplorasi",
    description: "Racikan baru untuk dicoba.",
    note: "Fruity · 250 ml",
    tone: "dark",
    price: 14500,
  };
  const findMany = vi.fn();

  beforeEach(() => {
    findMany.mockReset();
    findMany.mockImplementation(async ({ where }: { where: { key: { in: string[] } } }) => {
      if (where.key.in.includes("catalog.products.custom")) {
        return [{ key: "catalog.products.custom", value: [customProduct] }];
      }
      if (where.key.in.includes("catalog.product.kopi-liberika")) {
        return [{
          key: "catalog.product.kopi-liberika",
          value: {
            price: 15500,
            isActive: false,
            imageKey: "catalog/kopi-liberika/image-123.webp",
          },
        }];
      }
      return [];
    });
  });

  it("includes custom products and their price, availability, and uploaded image", async () => {
    const catalog = await getCatalogProducts({ setting: { findMany } } as never);
    const product = catalog.find((item) => item.id === customProduct.id);

    expect(product).toMatchObject({
      ...customProduct,
      price: 15500,
      isActive: false,
      imageUrl: "/api/v1/catalog/images/kopi-liberika?v=catalog%2Fkopi-liberika%2Fimage-123.webp",
    });
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it("ignores malformed custom catalog entries", async () => {
    findMany.mockImplementation(async ({ where }: { where: { key: { in: string[] } } }) =>
      where.key.in.includes("catalog.products.custom")
        ? [{ key: "catalog.products.custom", value: [{ ...customProduct, tone: "url(javascript:alert(1))" }] }]
        : [],
    );
    const catalog = await getCatalogProducts({ setting: { findMany } } as never);
    expect(catalog.some((item) => item.id === customProduct.id)).toBe(false);
  });
});
