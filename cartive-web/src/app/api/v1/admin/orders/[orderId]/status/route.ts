import { z } from "zod";
import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { sendOrderStatusPush } from "@/lib/external-notifications";
import { getPurchasedBottleCount } from "@/lib/order-pricing";
import { databaseUnavailableResponse, isSameOrigin } from "@/lib/security";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("QUOTE"),
    deliveryFee: z.number().int().min(0).max(500000),
  }).strict(),
  z.object({ action: z.literal("CONFIRM_PAYMENT") }).strict(),
  z.object({
    action: z.literal("ADVANCE"),
    status: z.enum(["PROCESSING", "READY", "COMPLETED"]),
  }).strict(),
  z.object({ action: z.literal("CANCEL") }).strict(),
]);

type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
    );
  }

  const { orderId } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(orderId)) {
    return Response.json(
      { data: null, error: { code: "ORDER_NOT_FOUND", message: "Pesanan tidak ditemukan." } },
      { status: 404 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { data: null, error: { code: "INVALID_JSON", message: "Perubahan status tidak terbaca." } },
      { status: 400 },
    );
  }
  const parsed = actionSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Perubahan status tidak valid." } },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const outcome = await db.$transaction(async (transaction) => {
      const order = await transaction.webOrder.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          code: true,
          memberId: true,
          status: true,
          fulfillment: true,
          subtotal: true,
          discount: true,
          rewardId: true,
          paymentProofKey: true,
          items: { select: { quantity: true, isReward: true } },
        },
      });
      if (!order) return { error: "NOT_FOUND" as const };

      const now = new Date();
      if (parsed.data.action === "QUOTE") {
        if (order.status !== "AWAITING_QUOTE" || order.fulfillment !== "DELIVERY") {
          return { error: "INVALID_TRANSITION" as const };
        }
        const total = order.subtotal - order.discount + parsed.data.deliveryFee;
        const updated = await transaction.webOrder.updateMany({
          where: { id: order.id, status: "AWAITING_QUOTE" },
          data: {
            deliveryFee: parsed.data.deliveryFee,
            total,
            status: "AWAITING_PAYMENT",
            statusUpdatedAt: now,
          },
        });
        if (updated.count !== 1) return { error: "INVALID_TRANSITION" as const };
        await transaction.adminAuditLog.create({
          data: {
            actorEmail: access.email,
            action: "ORDER_DELIVERY_QUOTED",
            entityType: "WebOrder",
            entityId: order.id,
            metadata: { deliveryFee: parsed.data.deliveryFee, total },
          },
        });
        return {
          code: order.code,
          memberId: order.memberId,
          status: "AWAITING_PAYMENT" as const,
        };
      }

      if (parsed.data.action === "CONFIRM_PAYMENT") {
        if (order.status !== "PAYMENT_REVIEW" || !order.paymentProofKey) {
          return { error: "PAYMENT_NOT_REVIEWABLE" as const };
        }
        const updated = await transaction.webOrder.updateMany({
          where: { id: order.id, status: "PAYMENT_REVIEW", paymentProofKey: { not: null } },
          data: { status: "PAID", paidAt: now, statusUpdatedAt: now },
        });
        if (updated.count !== 1) return { error: "INVALID_TRANSITION" as const };

        const stamps = getPurchasedBottleCount(order.items) * 2;
        if (stamps > 0) {
          await transaction.stampLedger.create({
            data: {
              memberId: order.memberId,
              delta: stamps,
              reason: "WEB_ORDER",
              refType: "WebOrder",
              refId: order.id,
            },
          });
        }
        await transaction.member.update({
          where: { id: order.memberId },
          data: { lastActivityAt: now, stampExpiryProcessedAt: null },
        });
        await transaction.adminAuditLog.create({
          data: {
            actorEmail: access.email,
            action: "ORDER_PAYMENT_CONFIRMED",
            entityType: "WebOrder",
            entityId: order.id,
            metadata: { stampsAdded: stamps },
          },
        });
        return {
          code: order.code,
          memberId: order.memberId,
          status: "PAID" as const,
          stampsAdded: stamps,
        };
      }

      let nextStatus: "PROCESSING" | "READY" | "COMPLETED" | "CANCELLED";
      if (parsed.data.action === "CANCEL") {
        if (!["AWAITING_QUOTE", "AWAITING_PAYMENT"].includes(order.status)) {
          return { error: "INVALID_TRANSITION" as const };
        }
        nextStatus = "CANCELLED";
      } else {
        const allowed = {
          PAID: "PROCESSING",
          PROCESSING: "READY",
          READY: "COMPLETED",
        } as const;
        const expected = allowed[order.status as keyof typeof allowed];
        if (expected !== parsed.data.status) return { error: "INVALID_TRANSITION" as const };
        nextStatus = parsed.data.status;
      }
      const updated = await transaction.webOrder.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: nextStatus, statusUpdatedAt: now },
      });
      if (updated.count !== 1) return { error: "INVALID_TRANSITION" as const };
      if (nextStatus === "CANCELLED") {
        const allocations = await transaction.orderBatchAllocation.findMany({
          where: { orderId: order.id },
          select: { batchId: true, quantity: true },
        });
        for (const allocation of allocations) {
          await transaction.productBatch.update({
            where: { id: allocation.batchId },
            data: { quantityAvailable: { increment: allocation.quantity } },
          });
        }
        if (order.rewardId) {
          await transaction.reward.updateMany({
            where: {
              id: order.rewardId,
              status: "USED",
              expiresAt: { gt: now },
            },
            data: { status: "AVAILABLE", usedAt: null },
          });
          await transaction.reward.updateMany({
            where: {
              id: order.rewardId,
              status: "USED",
              OR: [{ expiresAt: { lte: now } }, { expiresAt: null }],
            },
            data: { status: "EXPIRED" },
          });
        }
      }
      await transaction.adminAuditLog.create({
        data: {
          actorEmail: access.email,
          action: nextStatus === "CANCELLED" ? "ORDER_CANCELLED" : "ORDER_STATUS_ADVANCED",
          entityType: "WebOrder",
          entityId: order.id,
          metadata: { status: nextStatus },
        },
      });
      return { code: order.code, memberId: order.memberId, status: nextStatus };
    });

    if ("error" in outcome) {
      const status = outcome.error === "NOT_FOUND" ? 404 : 409;
      const message = outcome.error === "NOT_FOUND"
        ? "Pesanan tidak ditemukan."
        : outcome.error === "PAYMENT_NOT_REVIEWABLE"
          ? "Pesanan belum memiliki bukti pembayaran yang menunggu pemeriksaan."
          : "Perubahan status tidak sesuai dengan tahap pesanan saat ini.";
      return Response.json(
        { data: null, error: { code: outcome.error, message } },
        { status },
      );
    }

    await sendOrderStatusPush(
      outcome.memberId,
      outcome.status,
      "stampsAdded" in outcome ? outcome.stampsAdded : 0,
    );
    const publicOutcome = {
      code: outcome.code,
      status: outcome.status,
      ...("stampsAdded" in outcome ? { stampsAdded: outcome.stampsAdded } : {}),
    };
    return Response.json({ data: publicOutcome, error: null }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
