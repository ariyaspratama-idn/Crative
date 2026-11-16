import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { serializeCsv } from "@/lib/csv";
import { getDb } from "@/lib/db";
import { databaseUnavailableResponse } from "@/lib/security";

const EXPORT_LIMIT = 5000;

export async function GET(request: NextRequest) {
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  try {
    const orders = await getDb().webOrder.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: EXPORT_LIMIT + 1,
      select: {
        code: true,
        status: true,
        fulfillment: true,
        subtotal: true,
        discount: true,
        deliveryFee: true,
        total: true,
        createdAt: true,
        items: { select: { name: true, quantity: true, isReward: true } },
      },
    });
    if (orders.length > EXPORT_LIMIT) {
      return Response.json(
        { data: null, error: { code: "EXPORT_TOO_LARGE", message: "Jumlah pesanan melebihi 5.000. Ekspor per periode perlu disiapkan agar data tidak terpotong." } },
        { status: 413 },
      );
    }

    const csv = serializeCsv([
      ["Kode", "Status", "Dibuat (WIB)", "Penerimaan", "Item", "Subtotal", "Diskon", "Ongkir", "Total"],
      ...orders.map((order) => [
        order.code,
        order.status,
        new Intl.DateTimeFormat("id-ID", {
          dateStyle: "short",
          timeStyle: "medium",
          timeZone: "Asia/Jakarta",
        }).format(order.createdAt),
        order.fulfillment,
        order.items.map((item) => `${item.name} x${item.quantity}${item.isReward ? " (reward)" : ""}`).join("; "),
        order.subtotal,
        order.discount,
        order.deliveryFee,
        order.total,
      ]),
    ]);

    await getDb().adminAuditLog.create({
      data: {
        actorEmail: access.email,
        action: "ORDERS_EXPORTED_CSV",
        entityType: "WebOrder",
        entityId: "all",
        metadata: { rowCount: orders.length },
      },
    });

    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="cartive-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
