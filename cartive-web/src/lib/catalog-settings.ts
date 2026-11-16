import "server-only";

import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { products, type CatalogProduct } from "@/lib/catalog";

export type CatalogProductSettings = Omit<CatalogProduct, "price"> & {
  price: number;
  isActive: boolean;
};

type SettingsReader = {
  setting: Pick<Prisma.TransactionClient["setting"], "findMany">;
};

type StoredProductSettings = {
  price: number;
  isActive: boolean;
};

export function catalogSettingKey(productId: string) {
  return `catalog.product.${productId}`;
}

function isStoredProductSettings(value: Prisma.JsonValue): value is StoredProductSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, Prisma.JsonValue>;
  return (
    Number.isSafeInteger(record.price) &&
    typeof record.isActive === "boolean" &&
    Number(record.price) >= 0
  );
}

export async function getCatalogProducts(reader: SettingsReader = getDb()) {
  const settings = await reader.setting.findMany({
    where: { key: { in: products.map((product) => catalogSettingKey(product.id)) } },
    select: { key: true, value: true },
  });
  const overrides = new Map<string, StoredProductSettings>();
  for (const setting of settings) {
    if (isStoredProductSettings(setting.value)) {
      overrides.set(setting.key, setting.value);
    }
  }

  return products.map((product): CatalogProductSettings => {
    const stored = overrides.get(catalogSettingKey(product.id));
    return {
      ...product,
      price: stored?.price ?? product.price,
      isActive: stored?.isActive ?? true,
    };
  });
}
