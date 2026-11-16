import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentMember } from "@/lib/member-session";
import { databaseUnavailableResponse } from "@/lib/security";
import { getQrisImageUrl, orderStatusLabels } from "@/lib/web-order";

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { code } = await context.params;
  if (!/^CRT-\d{6}-[A-F0-9]{6}$/.test(code)) {
    return Response.json(
      { data: null, error: { code: "ORDER_NOT_FOUND", message: "Pesanan tidak ditemukan." } },
      { status: 404 },
    );
  }

  try {
    const member = await getCurrentMember();
    if (!member) {
      return Response.json(
        { data: null, error: { code: "UNAUTHENTICATED", message: "Masuk untuk membuka status pesanan." } },
        { status: 401 },
      );
    }

    const order = await getDb().webOrder.findFirst({
      where: { code, memberId: member.id },
      select: {
        code: true,
        status: true,
        fulfillment: true,
        deliveryAddress: true,
        note: true,
        subtotal: true,
        discount: true,
        deliveryFee: true,
        total: true,
        paymentProofKey: true,
        paidAt: true,
        createdAt: true,
        items: {
          select: { productId: true, name: true, quantity: true, unitPrice: true, isReward: true },
          orderBy: { name: "asc" },
        },
      },
    });
    if (!order) {
      return Response.json(
        { data: null, error: { code: "ORDER_NOT_FOUND", message: "Pesanan tidak ditemukan." } },
        { status: 404 },
      );
    }

    const { paymentProofKey, ...publicOrder } = order;
    const qrisImageUrl = order.status === "AWAITING_PAYMENT" ? getQrisImageUrl() : null;
    const localSimulation =
      !qrisImageUrl &&
      process.env.NODE_ENV === "development" &&
      ["localhost", "127.0.0.1", "::1"].includes(request.nextUrl.hostname.toLowerCase());
    return Response.json({
      data: {
        ...publicOrder,
        statusLabel: orderStatusLabels[order.status],
        paymentProofUploaded: Boolean(paymentProofKey),
        qrisImageUrl,
        localSimulation,
      },
      error: null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
