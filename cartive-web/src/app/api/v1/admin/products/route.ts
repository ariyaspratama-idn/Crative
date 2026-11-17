import { z } from "zod";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { CUSTOM_PRODUCTS_KEY, catalogSettingKey } from "@/lib/catalog-settings";
import { getDb } from "@/lib/db";
import { products } from "@/lib/catalog";
import { databaseUnavailableResponse, isSameOrigin } from "@/lib/security";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  line: z.string().trim().min(1).max(30),
  description: z.string().trim().min(1).max(300),
  note: z.string().trim().min(1).max(100),
  tone: z.enum(["espresso", "dark", "black", "caramel", "cream", "honey"]),
  price: z.number().int().min(0).max(1_000_000),
}).strict();

function createProductId(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
    );
  }
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { data: null, error: { code: "INVALID_JSON", message: "Data produk tidak terbaca." } },
      { status: 400 },
    );
  }
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Data produk tidak valid." } },
      { status: 400 },
    );
  }
  const id = createProductId(parsed.data.name);
  if (!id) {
    return Response.json(
      { data: null, error: { code: "INVALID_PRODUCT_NAME", message: "Nama perlu mengandung huruf atau angka." } },
      { status: 400 },
    );
  }
  const product = { id, ...parsed.data };

  try {
    const result = await getDb().$transaction(async (transaction) => {
      const current = await transaction.setting.findUnique({
        where: { key: CUSTOM_PRODUCTS_KEY },
        select: { value: true },
      });
      const currentProducts = Array.isArray(current?.value) ? current.value : [];
      if (
        products.some((item) => item.id === id) ||
        currentProducts.some((item) =>
          typeof item === "object" && item !== null && "id" in item && item.id === id
        )
      ) {
        return { conflict: true as const };
      }
      if (currentProducts.length >= 100) {
        return { limitReached: true as const };
      }

      await transaction.setting.upsert({
        where: { key: CUSTOM_PRODUCTS_KEY },
        create: { key: CUSTOM_PRODUCTS_KEY, value: [...currentProducts, product] },
        update: { value: [...currentProducts, product] },
      });
      await transaction.setting.create({
        data: {
          key: catalogSettingKey(id),
          value: { price: product.price, isActive: true },
        },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorEmail: access.email,
          action: "CATALOG_PRODUCT_CREATED",
          entityType: "Product",
          entityId: id,
          metadata: { name: product.name, line: product.line, price: product.price },
        },
      });
      return { product };
    });

    if ("conflict" in result) {
      return Response.json(
        { data: null, error: { code: "PRODUCT_ALREADY_EXISTS", message: "Nama ini menghasilkan ID produk yang sudah ada. Bedakan nama produknya." } },
        { status: 409 },
      );
    }
    if ("limitReached" in result) {
      return Response.json(
        { data: null, error: { code: "CATALOG_LIMIT_REACHED", message: "Katalog sudah mencapai batas 100 produk tambahan." } },
        { status: 409 },
      );
    }
    return Response.json(
      { data: { ...result.product, isActive: true, imageUrl: null }, error: null },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json(
        { data: null, error: { code: "PRODUCT_ALREADY_EXISTS", message: "Produk dengan ID tersebut sudah ada." } },
        { status: 409 },
      );
    }
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
