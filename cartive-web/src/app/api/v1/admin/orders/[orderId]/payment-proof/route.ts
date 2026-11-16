import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { databaseUnavailableResponse } from "@/lib/security";
import { disposeStorageClient, readPrivateReceipt } from "@/lib/receipt-storage";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  const { orderId } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(orderId)) {
    return Response.json(
      { data: null, error: { code: "ORDER_NOT_FOUND", message: "Bukti pembayaran tidak ditemukan." } },
      { status: 404 },
    );
  }

  try {
    const order = await getDb().webOrder.findUnique({
      where: { id: orderId },
      select: { paymentProofKey: true },
    });
    if (!order?.paymentProofKey) {
      return Response.json(
        { data: null, error: { code: "PAYMENT_PROOF_NOT_FOUND", message: "Bukti pembayaran tidak tersedia." } },
        { status: 404 },
      );
    }

    const proof = await readPrivateReceipt(order.paymentProofKey);
    try {
      return new Response(proof.body, {
        headers: {
          "Content-Type": "image/webp",
          "Content-Disposition": "inline; filename=\"payment-proof.webp\"",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } finally {
      disposeStorageClient(proof.client);
    }
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    if (error instanceof Error && error.name === "StorageError") {
      return Response.json(
        { data: null, error: { code: "PAYMENT_PROOF_UNAVAILABLE", message: "Bukti pembayaran belum dapat ditampilkan." } },
        { status: 503 },
      );
    }
    throw error;
  }
}
