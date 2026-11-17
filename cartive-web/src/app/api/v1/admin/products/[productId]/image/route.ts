import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getCatalogProducts, catalogSettingKey } from "@/lib/catalog-settings";
import { deleteCatalogImage, storeCatalogImage } from "@/lib/catalog-image-storage";
import { getDb } from "@/lib/db";
import { ConfigurationError, databaseUnavailableResponse, isSameOrigin } from "@/lib/security";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
type RouteContext = { params: Promise<{ productId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
    );
  }
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  const { productId } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productId)) {
    return Response.json(
      { data: null, error: { code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan." } },
      { status: 404 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { data: null, error: { code: "INVALID_IMAGE", message: "Pilih file gambar yang valid." } },
      { status: 400 },
    );
  }
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return Response.json(
      { data: null, error: { code: "INVALID_IMAGE_SIZE", message: "Pilih gambar dengan ukuran maksimal 4 MB." } },
      { status: 400 },
    );
  }

  let image: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(input, { limitInputPixels: 20_000_000 }).metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      return Response.json(
        { data: null, error: { code: "UNSUPPORTED_IMAGE", message: "Format gambar harus JPEG, PNG, atau WebP." } },
        { status: 400 },
      );
    }
    image = await sharp(input, { limitInputPixels: 20_000_000 })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return Response.json(
      { data: null, error: { code: "INVALID_IMAGE", message: "Gambar tidak dapat dibaca. Coba file JPEG, PNG, atau WebP lain." } },
      { status: 400 },
    );
  }

  const db = getDb();
  let newKey: string | null = null;
  let settingCommitted = false;
  try {
    const catalog = await getCatalogProducts(db);
    if (!catalog.some((product) => product.id === productId)) {
      return Response.json(
        { data: null, error: { code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan." } },
        { status: 404 },
      );
    }

    const currentSetting = await db.setting.findUnique({
      where: { key: catalogSettingKey(productId) },
      select: { value: true },
    });
    const currentValue =
      typeof currentSetting?.value === "object" &&
      currentSetting.value !== null &&
      !Array.isArray(currentSetting.value)
        ? currentSetting.value as Record<string, unknown>
        : {};
    const previousKey =
      typeof currentValue.imageKey === "string" &&
      new RegExp(`^catalog/${productId}/[A-Za-z0-9_-]+\\.webp$`).test(currentValue.imageKey)
        ? currentValue.imageKey
        : null;
    newKey = `catalog/${productId}/${randomUUID()}.webp`;
    await storeCatalogImage(newKey, image);

    await db.$transaction(async (transaction) => {
      const setting = await transaction.setting.findUnique({
        where: { key: catalogSettingKey(productId) },
        select: { value: true },
      });
      const value =
        typeof setting?.value === "object" && setting.value !== null && !Array.isArray(setting.value)
          ? setting.value as Record<string, unknown>
          : {};
      await transaction.setting.upsert({
        where: { key: catalogSettingKey(productId) },
        create: {
          key: catalogSettingKey(productId),
          value: { price: catalog.find((product) => product.id === productId)!.price, isActive: true, imageKey: newKey },
        },
        update: { value: { ...value, imageKey: newKey } },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorEmail: access.email,
          action: "CATALOG_PRODUCT_IMAGE_UPDATED",
          entityType: "Product",
          entityId: productId,
          metadata: { replacedExistingImage: Boolean(previousKey), outputBytes: image.length },
        },
      });
    });
    settingCommitted = true;

    if (previousKey && previousKey !== newKey) {
      try {
        await deleteCatalogImage(previousKey);
      } catch (cleanupError) {
        console.error("Failed to remove a replaced catalog image.", cleanupError);
      }
    }
    return Response.json(
      { data: { imageUrl: `/api/v1/catalog/images/${productId}?v=${encodeURIComponent(newKey)}` }, error: null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (newKey && !settingCommitted) {
      try {
        await deleteCatalogImage(newKey);
      } catch (cleanupError) {
        console.error("Failed to clean up an unreferenced catalog image.", cleanupError);
      }
    }
    if (error instanceof ConfigurationError) {
      return Response.json(
        { data: null, error: { code: "CATALOG_STORAGE_UNAVAILABLE", message: error.message } },
        { status: 503 },
      );
    }
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
