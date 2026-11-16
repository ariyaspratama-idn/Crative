import { Prisma, type OrderStatus } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { getProduct } from "@/lib/catalog";
import { getCatalogProducts } from "@/lib/catalog-settings";
import { getDb } from "@/lib/db";
import { sendAdminAlert } from "@/lib/external-notifications";
import { getCurrentMember } from "@/lib/member-session";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getRewardDiscount, parseDailyOrderLimit } from "@/lib/order-pricing";
import { jakartaDayRange } from "@/lib/jakarta-date";
import { createOrderCode, orderStatusLabels } from "@/lib/web-order";
import { databaseUnavailableResponse, hashRateLimitKey, isSameOrigin } from "@/lib/security";

class StockUnavailableError extends Error {}
class OrderCodeCollisionError extends Error {}
class DailyOrderLimitError extends Error {
  constructor(readonly resetAt: Date) {
    super();
  }
}
class RewardUnavailableError extends Error {}
class ProductUnavailableError extends Error {}

const orderSchema = z.object({
  fulfillment: z.enum(["PICKUP", "DELIVERY"]),
  address: z.string().trim().max(400).optional(),
  note: z.string().trim().max(250).optional(),
  rewardCode: z.string().trim().toUpperCase().regex(/^[A-F0-9]{16}$/).optional(),
  freeBottleProductId: z.string().min(1).max(40).optional(),
  items: z.array(z.object({
    productId: z.string().min(1).max(40),
    quantity: z.number().int().min(1).max(20),
  }).strict()).min(1).max(6),
}).strict().superRefine((order, context) => {
  if (order.fulfillment === "DELIVERY" && !order.address?.trim()) {
    context.addIssue({
      code: "custom",
      path: ["address"],
      message: "Alamat diperlukan untuk pesanan yang diantar.",
    });
  }
});

export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return Response.json(
        { data: null, error: { code: "UNAUTHENTICATED", message: "Masuk ke Fuel Card untuk melihat pesanan." } },
        { status: 401 },
      );
    }

    const orders = await getDb().webOrder.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        code: true,
        status: true,
        fulfillment: true,
        subtotal: true,
        deliveryFee: true,
        total: true,
        createdAt: true,
      },
    });
    return Response.json({
      data: orders.map((order) => ({
        ...order,
        statusLabel: orderStatusLabels[order.status],
      })),
      error: null,
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}

export async function POST(request: NextRequest) {
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
      { data: null, error: { code: "INVALID_JSON", message: "Data pesanan tidak terbaca." } },
      { status: 400 },
    );
  }

  const parsed = orderSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Data pesanan tidak valid." } },
      { status: 400 },
    );
  }

  const requestedProducts = new Map<string, number>();
  for (const item of parsed.data.items) {
    if (!getProduct(item.productId)) {
      return Response.json(
        { data: null, error: { code: "INVALID_PRODUCT", message: "Salah satu produk tidak tersedia." } },
        { status: 400 },
      );
    }
    requestedProducts.set(
      item.productId,
      (requestedProducts.get(item.productId) ?? 0) + item.quantity,
    );
    if (requestedProducts.get(item.productId)! > 20) {
      return Response.json(
        { data: null, error: { code: "INVALID_QUANTITY", message: "Jumlah maksimal setiap varian adalah 20 botol per pesanan." } },
        { status: 400 },
      );
    }
  }
  const products: Array<{ product: NonNullable<ReturnType<typeof getProduct>>; quantity: number }> = [];
  for (const [productId, quantity] of requestedProducts) {
    const product = getProduct(productId);
    if (product) products.push({ product, quantity });
  }
  if (products.length !== requestedProducts.size) {
    return Response.json(
      { data: null, error: { code: "INVALID_PRODUCT", message: "Salah satu produk tidak tersedia." } },
      { status: 400 },
    );
  }

  try {
    const member = await getCurrentMember();
    if (!member) {
      return Response.json(
        { data: null, error: { code: "UNAUTHENTICATED", message: "Masuk ke Fuel Card sebelum membuat pesanan." } },
        { status: 401 },
      );
    }

    const limit = await consumeRateLimit("web-order-create", member.id, 60 * 60 * 1000, 10);
    if (!limit.allowed) {
      return Response.json(
        { data: null, error: { code: "RATE_LIMITED", message: "Batas pembuatan pesanan tercapai. Coba lagi nanti." } },
        { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)) } },
      );
    }

    const dailyOrderLimit = parseDailyOrderLimit(process.env.DAILY_WEB_ORDER_LIMIT);
    if (dailyOrderLimit === null) {
      return Response.json(
        { data: null, error: { code: "ORDER_LIMIT_NOT_CONFIGURED", message: "Batas pesanan harian belum dikonfigurasi dengan benar." } },
        { status: 503 },
      );
    }

    const isPickup = parsed.data.fulfillment === "PICKUP";
    const db = getDb();
    const createOrder = () => db.$transaction(async (transaction) => {
      const catalog = await getCatalogProducts(transaction);
      const catalogById = new Map(catalog.map((product) => [product.id, product]));
      const pricedProducts = products.map((item) => {
        const configured = catalogById.get(item.product.id);
        if (!configured?.isActive) throw new ProductUnavailableError(item.product.name);
        return {
          product: { ...item.product, price: configured.price },
          quantity: item.quantity,
        };
      });

      const { start, end } = jakartaDayRange();
      const dailyBucket = await transaction.rateLimitBucket.upsert({
        where: {
          key_windowStart: {
            key: hashRateLimitKey("web-order-global-daily"),
            windowStart: start,
          },
        },
        create: {
          key: hashRateLimitKey("web-order-global-daily"),
          windowStart: start,
          count: 1,
        },
        update: { count: { increment: 1 } },
        select: { count: true },
      });
      if (dailyBucket.count > dailyOrderLimit) throw new DailyOrderLimitError(end);

      const reward = parsed.data.rewardCode
        ? await transaction.reward.findFirst({
            where: {
              code: parsed.data.rewardCode,
              memberId: member.id,
              status: "AVAILABLE",
              expiresAt: { gt: new Date() },
            },
            select: { id: true, type: true },
          })
        : null;
      if (parsed.data.rewardCode && !reward) throw new RewardUnavailableError();
      if (reward?.type === "FREE_BOTTLE" && !parsed.data.freeBottleProductId) {
        throw new RewardUnavailableError();
      }
      if (reward?.type !== "FREE_BOTTLE" && parsed.data.freeBottleProductId) {
        throw new RewardUnavailableError();
      }

      const freeBottle = reward?.type === "FREE_BOTTLE" && parsed.data.freeBottleProductId
        ? getProduct(parsed.data.freeBottleProductId)
        : undefined;
      if (reward?.type === "FREE_BOTTLE" && !freeBottle) throw new RewardUnavailableError();
      const pricedFreeBottle = freeBottle
        ? catalogById.get(freeBottle.id)
        : undefined;
      if (freeBottle && !pricedFreeBottle?.isActive) {
        throw new ProductUnavailableError(freeBottle.name);
      }

      const orderItems = [
        ...pricedProducts.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          isReward: false,
        })),
        ...(freeBottle && pricedFreeBottle
          ? [{ product: { ...freeBottle, price: pricedFreeBottle.price }, quantity: 1, isReward: true }]
          : []),
      ];
      const baseSubtotal = pricedProducts.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      );
      const subtotal = baseSubtotal + (pricedFreeBottle?.price ?? 0);
      const discount = reward
        ? getRewardDiscount(reward.type, subtotal, freeBottle?.price)
        : 0;
      const total = subtotal - discount;

      if (reward) {
        const rewardReserved = await transaction.reward.updateMany({
          where: {
            id: reward.id,
            memberId: member.id,
            status: "AVAILABLE",
            expiresAt: { gt: new Date() },
          },
          data: { status: "USED", usedAt: new Date() },
        });
        if (rewardReserved.count !== 1) throw new RewardUnavailableError();
      }

      const created = await transaction.webOrder.create({
        data: {
          code: createOrderCode(),
          memberId: member.id,
          status: isPickup ? "AWAITING_PAYMENT" : "AWAITING_QUOTE",
          fulfillment: parsed.data.fulfillment,
          deliveryAddress: isPickup ? null : parsed.data.address?.trim(),
          note: parsed.data.note?.trim() || null,
          subtotal,
          discount,
          rewardId: reward?.id,
          deliveryFee: isPickup ? 0 : null,
          total: isPickup ? total : null,
          items: {
            create: orderItems.map((item) => ({
              productId: item.product.id,
              name: item.product.name,
              quantity: item.quantity,
              unitPrice: item.product.price,
              isReward: item.isReward,
            })),
          },
        },
        select: { id: true, code: true, status: true },
      });

      const now = new Date();
      for (const item of orderItems) {
        const datedBatches = await transaction.productBatch.findMany({
          where: {
            productId: item.product.id,
            isActive: true,
            quantityAvailable: { gt: 0 },
            bestBeforeAt: { gt: now },
          },
          orderBy: [{ bestBeforeAt: "asc" }, { createdAt: "asc" }],
          select: { id: true, quantityAvailable: true },
        });
        const undatedBatches = await transaction.productBatch.findMany({
          where: {
            productId: item.product.id,
            isActive: true,
            quantityAvailable: { gt: 0 },
            bestBeforeAt: null,
          },
          orderBy: { createdAt: "asc" },
          select: { id: true, quantityAvailable: true },
        });

        let remaining = item.quantity;
        for (const batch of [...datedBatches, ...undatedBatches]) {
          if (remaining === 0) break;
          const allocation = Math.min(remaining, batch.quantityAvailable);
          const reserved = await transaction.productBatch.updateMany({
            where: { id: batch.id, isActive: true, quantityAvailable: { gte: allocation } },
            data: { quantityAvailable: { decrement: allocation } },
          });
          if (reserved.count !== 1) continue;
          await transaction.orderBatchAllocation.create({
            data: { orderId: created.id, batchId: batch.id, quantity: allocation },
          });
          remaining -= allocation;
        }

        if (remaining > 0) throw new StockUnavailableError(item.product.name);
      }

      if (reward) {
        await transaction.adminAuditLog.create({
          data: {
            actorEmail: "system:customer",
            action: "ORDER_REWARD_APPLIED",
            entityType: "WebOrder",
            entityId: created.id,
            metadata: { rewardId: reward.id, type: reward.type, discount },
          },
        });
      }

      return { id: created.id, code: created.code, status: created.status };
    });
    let order: { id: string; code: string; status: OrderStatus } | null = null;
    for (let attempt = 0; attempt < 3 && !order; attempt += 1) {
      try {
        order = await createOrder();
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
          throw error;
        }
        if (attempt === 2) throw new OrderCodeCollisionError();
      }
    }
    if (!order) throw new OrderCodeCollisionError();

    await sendAdminAlert("order_created");
    return Response.json(
      { data: { code: order.code, status: order.status }, error: null },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof OrderCodeCollisionError) {
      return Response.json(
        { data: null, error: { code: "ORDER_CODE_UNAVAILABLE", message: "Pesanan belum dapat dibuat. Coba kembali beberapa saat lagi." } },
        { status: 503 },
      );
    }
    if (error instanceof DailyOrderLimitError) {
      return Response.json(
        { data: null, error: { code: "DAILY_ORDER_LIMIT", message: "Kuota toko hari ini sudah penuh. Silakan coba kembali besok." } },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil((error.resetAt.getTime() - Date.now()) / 1000))) },
        },
      );
    }
    if (error instanceof RewardUnavailableError) {
      return Response.json(
        { data: null, error: { code: "REWARD_UNAVAILABLE", message: "Kode reward tidak tersedia, sudah digunakan, atau tidak sesuai. Periksa pilihan hadiahnya lalu coba lagi." } },
        { status: 409 },
      );
    }
    if (error instanceof ProductUnavailableError) {
      return Response.json(
        { data: null, error: { code: "PRODUCT_UNAVAILABLE", message: `${error.message} sedang tidak ditawarkan. Muat ulang menu sebelum membuat pesanan.` } },
        { status: 409 },
      );
    }
    if (error instanceof StockUnavailableError) {
      return Response.json(
        { data: null, error: { code: "OUT_OF_STOCK", message: `${error.message} sedang habis atau stoknya tidak mencukupi.` } },
        { status: 409 },
      );
    }
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
