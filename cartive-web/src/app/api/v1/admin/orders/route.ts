import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { maskWhatsAppNumber } from "@/lib/phone";
import { databaseUnavailableResponse } from "@/lib/security";

export async function GET(request: NextRequest) {
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  try {
    const orders = await getDb().webOrder.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 100,
      select: {
        id: true,
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
        createdAt: true,
        member: { select: { waNumber: true } },
        items: {
          select: { productId: true, name: true, quantity: true, unitPrice: true, isReward: true },
        },
      },
    });

    return Response.json({
      data: orders.map(({ member, paymentProofKey, ...order }) => ({
        ...order,
        memberWa: maskWhatsAppNumber(member.waNumber),
        paymentProofAvailable: Boolean(paymentProofKey),
      })),
      error: null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
