import { z } from "zod";
import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { getMaximumAvailableQuantity } from "@/lib/inventory";
import { databaseUnavailableResponse, isSameOrigin } from "@/lib/security";

const updateSchema = z.object({
  quantityAvailable: z.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional(),
}).strict().refine(
  (value) => value.quantityAvailable !== undefined || value.isActive !== undefined,
  "Isi stok tersedia atau status aktif.",
);

type RouteContext = { params: Promise<{ batchId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
    );
  }

  const { batchId } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(batchId)) {
    return Response.json(
      { data: null, error: { code: "BATCH_NOT_FOUND", message: "Batch tidak ditemukan." } },
      { status: 404 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { data: null, error: { code: "INVALID_JSON", message: "Perubahan batch tidak terbaca." } },
      { status: 400 },
    );
  }
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Perubahan batch tidak valid." } },
      { status: 400 },
    );
  }

  try {
    const outcome = await getDb().$transaction(async (transaction) => {
      const current = await transaction.productBatch.findUnique({
        where: { id: batchId },
        select: {
          id: true,
          productId: true,
          batchCode: true,
          quantityProduced: true,
          quantityAvailable: true,
          isActive: true,
        },
      });
      if (!current) return { error: "NOT_FOUND" as const };

      const allocations = await transaction.orderBatchAllocation.aggregate({
        where: {
          batchId: current.id,
          order: { isNot: { status: "CANCELLED" } },
        },
        _sum: { quantity: true },
      });
      const maximumAvailable = getMaximumAvailableQuantity(
        current.quantityProduced,
        allocations._sum.quantity ?? 0,
      );
      const nextQuantity = parsed.data.quantityAvailable ?? current.quantityAvailable;
      if (
        parsed.data.quantityAvailable !== undefined &&
        nextQuantity > maximumAvailable
      ) {
        return { error: "QUANTITY_EXCEEDS_UNALLOCATED" as const, maximumAvailable };
      }
      const nextIsActive = parsed.data.isActive ?? current.isActive;
      const updated = await transaction.productBatch.updateMany({
        where: {
          id: current.id,
          quantityAvailable: current.quantityAvailable,
          isActive: current.isActive,
        },
        data: { quantityAvailable: nextQuantity, isActive: nextIsActive },
      });
      if (updated.count !== 1) return { error: "CONCURRENT_CHANGE" as const };

      await transaction.adminAuditLog.create({
        data: {
          actorEmail: access.email,
          action: "PRODUCT_BATCH_UPDATED",
          entityType: "ProductBatch",
          entityId: current.id,
          metadata: {
            batchCode: current.batchCode,
            previousQuantityAvailable: current.quantityAvailable,
            quantityAvailable: nextQuantity,
            previousIsActive: current.isActive,
            isActive: nextIsActive,
          },
        },
      });
      return {
        batch: {
          ...current,
          quantityAvailable: nextQuantity,
          isActive: nextIsActive,
        },
      };
    });

    if ("error" in outcome) {
      const notFound = outcome.error === "NOT_FOUND";
      const invalidQuantity = outcome.error === "QUANTITY_EXCEEDS_UNALLOCATED";
      return Response.json(
        {
          data: null,
          error: {
            code: notFound ? "BATCH_NOT_FOUND" : invalidQuantity ? "INVALID_STOCK" : "BATCH_CHANGED",
            message: notFound
              ? "Batch tidak ditemukan."
              : invalidQuantity
                ? `Stok tersedia tidak boleh melebihi ${outcome.maximumAvailable} botol karena sebagian stok sudah dialokasikan ke pesanan.`
                : "Data batch berubah saat diperbarui. Muat ulang lalu coba lagi.",
          },
        },
        { status: notFound ? 404 : invalidQuantity ? 400 : 409 },
      );
    }

    return Response.json({ data: outcome.batch, error: null }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
