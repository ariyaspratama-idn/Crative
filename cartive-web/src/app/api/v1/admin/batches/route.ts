import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { getCatalogProducts } from "@/lib/catalog-settings";
import { databaseUnavailableResponse, isSameOrigin } from "@/lib/security";

const batchSchema = z.object({
  productId: z.string().min(1).max(40),
  batchCode: z.string().trim().min(1).max(80),
  quantity: z.number().int().min(1).max(100000),
  bestBeforeDate: z.iso.date().optional(),
}).strict();

export async function GET(request: NextRequest) {
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  try {
    const db = getDb();
    const catalog = await getCatalogProducts(db);
    const batches = await db.productBatch.findMany({
      orderBy: [{ isActive: "desc" }, { bestBeforeAt: "asc" }, { createdAt: "desc" }],
      take: 200,
    });
    const catalogNames = new Map<string, string>(catalog.map((product) => [product.id, product.name]));
    return Response.json({
      data: batches.map((batch) => ({
        ...batch,
        productName: catalogNames.get(batch.productId) ?? "Produk tidak dikenal",
      })),
      error: null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { data: null, error: { code: "INVALID_JSON", message: "Data batch tidak terbaca." } },
      { status: 400 },
    );
  }
  const parsed = batchSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Data batch tidak valid." } },
      { status: 400 },
    );
  }
  let bestBeforeAt: Date | null = null;
  if (parsed.data.bestBeforeDate) {
    bestBeforeAt = new Date(`${parsed.data.bestBeforeDate}T23:59:59.999+07:00`);
    if (Number.isNaN(bestBeforeAt.getTime())) {
      return Response.json(
        { data: null, error: { code: "INVALID_EXPIRY", message: "Tanggal kedaluwarsa tidak valid." } },
        { status: 400 },
      );
    }
  }

  try {
    const db = getDb();
    const product = (await getCatalogProducts(db)).find((entry) => entry.id === parsed.data.productId);
    if (!product) {
      return Response.json(
        { data: null, error: { code: "INVALID_PRODUCT", message: "Pilih produk dari katalog Cartive." } },
        { status: 400 },
      );
    }
    const batch = await db.$transaction(async (transaction) => {
      const created = await transaction.productBatch.create({
        data: {
          productId: product.id,
          batchCode: parsed.data.batchCode,
          quantityProduced: parsed.data.quantity,
          quantityAvailable: parsed.data.quantity,
          bestBeforeAt,
        },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorEmail: access.email,
          action: "PRODUCT_BATCH_CREATED",
          entityType: "ProductBatch",
          entityId: created.id,
          metadata: {
            productId: product.id,
            batchCode: created.batchCode,
            quantity: created.quantityProduced,
          },
        },
      });
      return created;
    });
    return Response.json({ data: batch, error: null }, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json(
        { data: null, error: { code: "BATCH_ALREADY_EXISTS", message: "Kode batch tersebut sudah digunakan untuk produk ini." } },
        { status: 409 },
      );
    }
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
