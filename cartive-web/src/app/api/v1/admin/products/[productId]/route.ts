import { z } from "zod";
import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { catalogSettingKey, getCatalogProducts } from "@/lib/catalog-settings";
import { getDb } from "@/lib/db";
import { databaseUnavailableResponse, isSameOrigin } from "@/lib/security";

const updateSchema = z.object({
  price: z.number().int().min(0).max(1_000_000).optional(),
  isActive: z.boolean().optional(),
}).strict().refine(
  (value) => value.price !== undefined || value.isActive !== undefined,
  "Isi harga atau status ketersediaan.",
);

type RouteContext = { params: Promise<{ productId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
    );
  }
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  const { productId } = await context.params;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { data: null, error: { code: "INVALID_JSON", message: "Perubahan produk tidak terbaca." } },
      { status: 400 },
    );
  }
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Perubahan produk tidak valid." } },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const product = (await getCatalogProducts(db)).find((entry) => entry.id === productId);
    if (!product) {
      return Response.json(
        { data: null, error: { code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan." } },
        { status: 404 },
      );
    }
    const key = catalogSettingKey(product.id);
    const outcome = await db.$transaction(async (transaction) => {
      const currentSetting = await transaction.setting.findUnique({
        where: { key },
        select: { value: true },
      });
      const currentValue =
        typeof currentSetting?.value === "object" &&
        currentSetting.value !== null &&
        !Array.isArray(currentSetting.value)
          ? currentSetting.value
          : null;
      const previousPrice =
        currentValue && Number.isSafeInteger(currentValue.price)
          ? Number(currentValue.price)
          : product.price;
      const previousIsActive =
        currentValue && typeof currentValue.isActive === "boolean"
          ? currentValue.isActive
          : true;
      const next = {
        price: parsed.data.price ?? previousPrice,
        isActive: parsed.data.isActive ?? previousIsActive,
        ...(currentValue && typeof currentValue.imageKey === "string"
          ? { imageKey: currentValue.imageKey }
          : {}),
      };

      await transaction.setting.upsert({
        where: { key },
        create: { key, value: next },
        update: { value: next },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorEmail: access.email,
          action: "CATALOG_PRODUCT_UPDATED",
          entityType: "Product",
          entityId: product.id,
          metadata: {
            previousPrice,
            price: next.price,
            previousIsActive,
            isActive: next.isActive,
          },
        },
      });
      return next;
    });

    return Response.json(
      { data: { id: product.id, ...outcome }, error: null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
