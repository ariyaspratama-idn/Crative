import "server-only";

import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { products, type CatalogProduct } from "@/lib/catalog";

export type CatalogProductSettings = Omit<CatalogProduct, "price"> & {
  price: number;
  isActive: boolean;
  imageUrl: string | null;
};

type SettingsReader = {
  setting: Pick<Prisma.TransactionClient["setting"], "findMany">;
};

type StoredProductSettings = {
  price: number;
  isActive: boolean;
  imageKey?: string;
};

const CUSTOM_PRODUCTS_KEY = "catalog.products.custom";
const productTones = new Set(["espresso", "dark", "black", "caramel", "cream", "honey"]);

export function catalogSettingKey(productId: string) {
  return `catalog.product.${productId}`;
}

function isStoredProductSettings(value: Prisma.JsonValue): value is StoredProductSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, Prisma.JsonValue>;
  return (
    Number.isSafeInteger(record.price) &&
    typeof record.isActive === "boolean" &&
    Number(record.price) >= 0 &&
    (record.imageKey === undefined ||
      (typeof record.imageKey === "string" &&
        /^catalog\/[a-z0-9-]{1,40}\/[A-Za-z0-9_-]+\.webp$/.test(record.imageKey)))
  );
}

function isCustomProduct(value: Prisma.JsonValue): value is CatalogProduct {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, Prisma.JsonValue>;
  return (
    typeof record.id === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id) &&
    !products.some((product) => product.id === record.id) &&
    typeof record.name === "string" &&
    typeof record.line === "string" &&
    typeof record.description === "string" &&
    typeof record.note === "string" &&
    typeof record.tone === "string" &&
    productTones.has(record.tone) &&
    Number.isSafeInteger(record.price) &&
    Number(record.price) >= 0
  );
}

function isImageKey(imageKey: string | undefined, productId: string) {
  return Boolean(
    imageKey &&
      imageKey.startsWith(`catalog/${productId}/`) &&
      /^catalog\/[a-z0-9-]{1,40}\/[A-Za-z0-9_-]+\.webp$/.test(imageKey),
  );
}

export async function getCatalogProducts(reader: SettingsReader = getDb()) {
  const settings = await reader.setting.findMany({
    where: {
      key: {
        in: [...products.map((product) => catalogSettingKey(product.id)), CUSTOM_PRODUCTS_KEY],
      },
    },
    select: { key: true, value: true },
  });
  const overrides = new Map<string, StoredProductSettings>();
  let customProducts: CatalogProduct[] = [];
  for (const setting of settings) {
    if (setting.key === CUSTOM_PRODUCTS_KEY && Array.isArray(setting.value)) {
      customProducts = setting.value.filter(isCustomProduct);
    } else if (isStoredProductSettings(setting.value)) {
      overrides.set(setting.key, setting.value);
    }
  }
  if (customProducts.length > 0) {
    const customSettings = await reader.setting.findMany({
      where: { key: { in: customProducts.map((product) => catalogSettingKey(product.id)) } },
      select: { key: true, value: true },
    });
    for (const setting of customSettings) {
      if (isStoredProductSettings(setting.value)) {
        overrides.set(setting.key, setting.value);
      }
    }
  }

  return [...products, ...customProducts].map((product): CatalogProductSettings => {
    const stored = overrides.get(catalogSettingKey(product.id));
    return {
      ...product,
      price: stored?.price ?? product.price,
      isActive: stored?.isActive ?? true,
      imageUrl: isImageKey(stored?.imageKey, product.id)
        ? `/api/v1/catalog/images/${product.id}?v=${encodeURIComponent(stored!.imageKey!)}`
        : null,
    };
  });
}

export async function getCatalogProductImageKey(
  productId: string,
  reader: SettingsReader = getDb(),
) {
  const catalog = await getCatalogProducts(reader);
  if (!catalog.some((product) => product.id === productId)) return null;
  const setting = await reader.setting.findMany({
    where: { key: catalogSettingKey(productId) },
    select: { value: true },
  });
  const value = setting[0]?.value;
  if (!isStoredProductSettings(value)) return null;
  return isImageKey(value.imageKey, productId) ? value.imageKey! : null;
}

export { CUSTOM_PRODUCTS_KEY };
