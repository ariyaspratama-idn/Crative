import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { sendAdminAlert, sendOrderStatusPush } from "@/lib/external-notifications";
import { getCurrentMember } from "@/lib/member-session";
import { consumeRateLimit } from "@/lib/rate-limit";
import { processReceiptImage, ReceiptImageError } from "@/lib/receipt-processing";
import { storePrivateReceipt, deleteStoredReceipt, disposeStorageClient, StorageError } from "@/lib/receipt-storage";
import { ConfigurationError, databaseUnavailableResponse, isSameOrigin } from "@/lib/security";

export const maxDuration = 30;

type RouteContext = { params: Promise<{ code: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
    );
  }

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
        { data: null, error: { code: "UNAUTHENTICATED", message: "Masuk sebelum mengunggah bukti pembayaran." } },
        { status: 401 },
      );
    }

    const limit = await consumeRateLimit("order-payment-proof", member.id, 60 * 60 * 1000, 10);
    if (!limit.allowed) {
      return Response.json(
        { data: null, error: { code: "RATE_LIMITED", message: "Batas unggah bukti pembayaran tercapai." } },
        { status: 429 },
      );
    }

    const form = await request.formData();
    const file = form.get("proof");
    if (!(file instanceof File) || file.size === 0 || file.size > 4 * 1024 * 1024) {
      return Response.json(
        { data: null, error: { code: "INVALID_FILE_SIZE", message: "Pilih foto bukti pembayaran maksimal 4 MB." } },
        { status: 413 },
      );
    }

    const order = await getDb().webOrder.findFirst({
      where: { code, memberId: member.id },
      select: { id: true, status: true, paymentProofKey: true },
    });
    if (!order) {
      return Response.json(
        { data: null, error: { code: "ORDER_NOT_FOUND", message: "Pesanan tidak ditemukan." } },
        { status: 404 },
      );
    }
    if (order.status !== "AWAITING_PAYMENT" || order.paymentProofKey) {
      return Response.json(
        { data: null, error: { code: "PAYMENT_PROOF_NOT_ALLOWED", message: "Pesanan ini tidak sedang menunggu bukti pembayaran." } },
        { status: 409 },
      );
    }

    const input = Buffer.from(await file.arrayBuffer());
    const imageHash = createHash("sha256").update(input).digest("hex");
    const duplicate = await getDb().webOrder.findFirst({
      where: { paymentProofHash: imageHash },
      select: { id: true },
    });
    if (duplicate) {
      return Response.json(
        { data: null, error: { code: "DUPLICATE_PAYMENT_PROOF", message: "Foto bukti pembayaran ini sudah pernah diunggah." } },
        { status: 409 },
      );
    }

    const processed = await processReceiptImage(input);
    const imageKey = `orders/${order.id}/payment-proof/${randomUUID()}.webp`;
    const stored = await storePrivateReceipt(imageKey, processed);
    try {
      const updated = await getDb().$transaction(async (transaction) => {
        const result = await transaction.webOrder.updateMany({
          where: {
            id: order.id,
            status: "AWAITING_PAYMENT",
            paymentProofKey: null,
            paymentProofHash: null,
          },
          data: {
            paymentProofKey: imageKey,
            paymentProofHash: imageHash,
            status: "PAYMENT_REVIEW",
            statusUpdatedAt: new Date(),
          },
        });
        if (result.count !== 1) return false;
        await transaction.adminAuditLog.create({
          data: {
            actorEmail: "system:customer",
            action: "ORDER_PAYMENT_PROOF_SUBMITTED",
            entityType: "WebOrder",
            entityId: order.id,
            metadata: { memberId: member.id },
          },
        });
        return true;
      });
      if (!updated) {
        await deleteStoredReceipt(imageKey);
        return Response.json(
          { data: null, error: { code: "PAYMENT_PROOF_ALREADY_SUBMITTED", message: "Bukti pembayaran pesanan ini sudah dikirim." } },
          { status: 409 },
        );
      }
    } catch (error) {
      await deleteStoredReceipt(imageKey);
      throw error;
    } finally {
      disposeStorageClient(stored.client);
    }

    await Promise.all([
      sendAdminAlert("payment_proof"),
      sendOrderStatusPush(member.id, "PAYMENT_REVIEW"),
    ]);
    return Response.json(
      { data: { code, status: "PAYMENT_REVIEW" }, error: null },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const target =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.meta?.target
        : undefined;
    if (error instanceof ReceiptImageError) {
      return Response.json(
        { data: null, error: { code: "IMAGE_UNREADABLE", message: error.message } },
        { status: 422 },
      );
    }
    if (error instanceof ConfigurationError || error instanceof StorageError) {
      return Response.json(
        { data: null, error: { code: "STORAGE_UNAVAILABLE", message: error.message } },
        { status: 503 },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      (Array.isArray(target)
        ? target.includes("paymentProofHash")
        : typeof target === "string" && target.includes("paymentProofHash"))
    ) {
      return Response.json(
        { data: null, error: { code: "DUPLICATE_PAYMENT_PROOF", message: "Foto bukti pembayaran ini sudah pernah diunggah." } },
        { status: 409 },
      );
    }
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
