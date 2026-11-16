import { randomUUID } from "node:crypto";
import { Prisma, Platform } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import {
  getClaimWindowError,
  isShortOrderCode,
  isValidOrderId,
  normalizeOrderId,
  parseJakartaDateTimeLocal,
} from "@/lib/claim-validation";
import { getDb } from "@/lib/db";
import { sendAdminAlert } from "@/lib/external-notifications";
import { getCurrentMember } from "@/lib/member-session";
import { consumeDailyRateLimit } from "@/lib/rate-limit";
import { jakartaDayRange } from "@/lib/jakarta-date";
import { processReceiptImage, ReceiptImageError } from "@/lib/receipt-processing";
import {
  ConfigurationError,
  databaseUnavailableResponse,
  getRequestIp,
  isSameOrigin,
  safeFileDigest,
} from "@/lib/security";
import {
  deletePrivateReceipt,
  disposeStorageClient,
  storePrivateReceipt,
} from "@/lib/receipt-storage";
import { turnstileFailureResponse, verifyTurnstileToken } from "@/lib/turnstile";

export const maxDuration = 30;

const claimFields = z.object({
  platform: z.nativeEnum(Platform),
  orderId: z.string().trim().min(1).max(80),
  bottleCount: z.coerce.number().int().min(1).max(6),
  orderedAt: z.string().min(1).max(32),
});

export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return Response.json(
        { data: null, error: { code: "UNAUTHENTICATED", message: "Masuk untuk melihat riwayat klaim." } },
        { status: 401 },
      );
    }

    const db = getDb();
    const claims = await db.claim.findMany({
      where: { memberId: member.id },
      select: {
        id: true,
        platform: true,
        orderId: true,
        claimedBottleCount: true,
        status: true,
        reasonCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return Response.json({ data: claims, error: null });
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

  try {
    const member = await getCurrentMember();
    if (!member) {
      return Response.json(
        { data: null, error: { code: "UNAUTHENTICATED", message: "Masuk sebelum mengirim klaim." } },
        { status: 401 },
      );
    }

    const db = getDb();
    const ip = getRequestIp(request);
    if (!ip) {
      return Response.json(
        {
          data: null,
          error: {
            code: "RATE_LIMIT_UNAVAILABLE",
            message: "Alamat jaringan belum tersedia dari proxy tepercaya. Coba lagi setelah konfigurasi server diperiksa.",
          },
        },
        { status: 503 },
      );
    }

    const form = await request.formData();
    const honeypot = form.get("website");
    if (typeof honeypot === "string" && honeypot.trim()) {
      return Response.json(
        { data: null, error: { code: "BOT_CHECK_FAILED", message: "Permintaan tidak dapat diproses." } },
        { status: 400 },
      );
    }
    const turnstileToken = form.get("turnstileToken");
    const botCheck = await verifyTurnstileToken(
      typeof turnstileToken === "string" ? turnstileToken : "",
      "claim",
    );
    if (!botCheck.valid) return turnstileFailureResponse(botCheck.unavailable);

    const parsed = claimFields.safeParse({
      platform: form.get("platform"),
      orderId: form.get("orderId"),
      bottleCount: form.get("bottleCount"),
      orderedAt: form.get("orderedAt"),
    });
    const receipt = form.get("receipt");
    if (!parsed.success || !(receipt instanceof File)) {
      return Response.json(
        { data: null, error: { code: "INVALID_INPUT", message: "Lengkapi platform, order ID, jumlah botol, dan foto struk." } },
        { status: 400 },
      );
    }

    const orderId = normalizeOrderId(parsed.data.orderId);
    if (isShortOrderCode(orderId)) {
      return Response.json(
        {
          data: null,
          error: {
            code: "SHORT_CODE",
            message: "Itu nomor antrean toko, bukan ID pesanan. Cari ID pesanan di aplikasi atau email konfirmasi.",
          },
        },
        { status: 422 },
      );
    }
    if (!isValidOrderId(parsed.data.platform, orderId)) {
      return Response.json(
        {
          data: null,
          error: {
            code: "FORMAT_MISMATCH",
            message: "Order ID tidak sesuai pola awal platform yang dipilih. Periksa kembali ID di aplikasi.",
          },
        },
        { status: 422 },
      );
    }
    const orderedAt = parseJakartaDateTimeLocal(parsed.data.orderedAt);
    if (!orderedAt) {
      return Response.json(
        { data: null, error: { code: "INVALID_ORDER_TIME", message: "Masukkan tanggal dan waktu pesanan yang valid sesuai zona WIB." } },
        { status: 422 },
      );
    }
    const claimWindowError = getClaimWindowError(orderedAt, new Date());
    if (claimWindowError) {
      return Response.json(
        {
          data: null,
          error: {
            code: claimWindowError,
            message: claimWindowError === "FUTURE_ORDER"
              ? "Waktu pesanan tidak boleh berada di masa depan."
              : "Klaim hanya dapat dikirim maksimal 48 jam setelah waktu pesanan.",
          },
        },
        { status: 422 },
      );
    }
    if (receipt.size === 0 || receipt.size > 5 * 1024 * 1024) {
      return Response.json(
        { data: null, error: { code: "INVALID_FILE_SIZE", message: "Foto struk harus berukuran antara 1 byte dan 5 MB." } },
        { status: 413 },
      );
    }

    const { start, end } = jakartaDayRange();
    const [memberLimit, ipLimit, dailyClaims] = await Promise.all([
      consumeDailyRateLimit("claim-member", member.id, 5),
      consumeDailyRateLimit("claim-ip", ip, 10),
      db.claim.count({
        where: {
          memberId: member.id,
          createdAt: { gte: start, lt: end },
        },
      }),
    ]);

    if (!memberLimit.allowed || !ipLimit.allowed || dailyClaims >= 5) {
      return Response.json(
        { data: null, error: { code: "DAILY_LIMIT", message: "Batas klaim hari ini tercapai. Coba lagi besok." } },
        { status: 429 },
      );
    }

    const existing = await db.claim.findUnique({
      where: { dedupeKey: `${parsed.data.platform}:${orderId}` },
      select: { id: true },
    });
    if (existing) {
      return Response.json(
        { data: null, error: { code: "ORDER_DUPLICATE", message: "Order ID ini sudah diklaim." } },
        { status: 409 },
      );
    }

    const input = Buffer.from(await receipt.arrayBuffer());
    const image = await processReceiptImage(input);
    const imageHash = safeFileDigest(image);

    const imageKey = `${member.id}/${randomUUID()}.webp`;
    const storage = await storePrivateReceipt(imageKey, image);

    try {
      const claim = await db.$transaction(async (transaction) => {
        const createdClaim = await transaction.claim.create({
          data: {
            memberId: member.id,
            platform: parsed.data.platform,
            orderId,
            dedupeKey: `${parsed.data.platform}:${orderId}`,
            claimedBottleCount: parsed.data.bottleCount,
            orderedAt,
            status: "NEEDS_REVIEW",
            imageKey,
            imageHash,
          },
          select: { id: true, status: true, createdAt: true },
        });
        await transaction.claimReceiptFingerprint.create({
          data: { imageHash, claimId: createdClaim.id },
        });
        await transaction.member.update({
          where: { id: member.id },
          data: { lastActivityAt: new Date(), stampExpiryProcessedAt: null },
        });
        return createdClaim;
      });

      await sendAdminAlert("claim_pending");
      return Response.json(
        {
          data: {
            ...claim,
            message: "Klaim diterima dan menunggu pemeriksaan. Stamp baru ditambahkan setelah klaim disetujui.",
          },
          error: null,
        },
        { status: 201 },
      );
    } catch (error) {
      await deletePrivateReceipt(storage.client, storage.bucket, imageKey);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const duplicateOrder = await db.claim.findUnique({
          where: { dedupeKey: `${parsed.data.platform}:${orderId}` },
          select: { id: true },
        });
        return Response.json(
          duplicateOrder
            ? { data: null, error: { code: "ORDER_DUPLICATE", message: "Order ID ini sudah diklaim atau sedang diperiksa." } }
            : { data: null, error: { code: "DUPLICATE_IMAGE", message: "Foto struk ini sudah pernah digunakan. Gunakan foto struk untuk pesanan yang berbeda." } },
          { status: 409 },
        );
      }
      throw error;
    } finally {
      disposeStorageClient(storage.client);
    }
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    if (error instanceof ConfigurationError && error.message.startsWith("Penyimpanan")) {
      return Response.json(
        { data: null, error: { code: "STORAGE_UNAVAILABLE", message: error.message } },
        { status: 503 },
      );
    }
    if (error instanceof ConfigurationError) {
      return Response.json(
        {
          data: null,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Layanan belum siap karena konfigurasi keamanan server belum lengkap.",
          },
        },
        { status: 503 },
      );
    }
    if (error instanceof ReceiptImageError) {
      return Response.json(
        { data: null, error: { code: "IMAGE_UNREADABLE", message: error.message } },
        { status: 422 },
      );
    }
    if (error instanceof Error && error.name === "StorageError") {
      return Response.json(
        { data: null, error: { code: "STORAGE_UNAVAILABLE", message: "Foto belum dapat disimpan dengan aman. Coba lagi nanti." } },
        { status: 503 },
      );
    }
    throw error;
  }
}
