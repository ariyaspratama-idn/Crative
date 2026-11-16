import { createHmac, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentMember } from "@/lib/member-session";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  ConfigurationError,
  databaseUnavailableResponse,
  isSameOrigin,
  getSessionSecret,
} from "@/lib/security";

const CODE_LIFETIME_MS = 24 * 60 * 60 * 1000;

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
        { data: null, error: { code: "UNAUTHENTICATED", message: "Masuk untuk memverifikasi nomor WhatsApp." } },
        { status: 401 },
      );
    }
    if (member.waVerifiedAt) {
      return Response.json(
        { data: null, error: { code: "ALREADY_VERIFIED", message: "Nomor WhatsApp ini sudah terverifikasi." } },
        { status: 409 },
      );
    }

    const contactNumber = process.env.CARTIVE_WHATSAPP_NUMBER;
    if (!contactNumber || !/^62\d{8,12}$/.test(contactNumber)) {
      return Response.json(
        { data: null, error: { code: "WHATSAPP_CHANNEL_UNAVAILABLE", message: "Nomor WhatsApp resmi Cartive belum dikonfigurasi." } },
        { status: 503 },
      );
    }

    const db = getDb();
    const limit = await consumeRateLimit(
      "wa-verification-member",
      member.id,
      24 * 60 * 60 * 1000,
      3,
    );
    if (!limit.allowed) {
      return Response.json(
        { data: null, error: { code: "RATE_LIMITED", message: "Batas permintaan verifikasi hari ini tercapai. Coba lagi besok." } },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)) },
        },
      );
    }

    const code = randomBytes(5).toString("hex").toUpperCase();
    const codeHash = createHmac("sha256", getSessionSecret())
      .update(`wa-verification:${code}`)
      .digest("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CODE_LIFETIME_MS);

    await db.$transaction(async (transaction) => {
      await transaction.waVerification.upsert({
        where: { memberId: member.id },
        create: { memberId: member.id, codeHash, requestedAt: now, expiresAt },
        update: {
          codeHash,
          requestedAt: now,
          expiresAt,
          confirmedAt: null,
          confirmedBy: null,
        },
      });
      await transaction.member.update({
        where: { id: member.id },
        data: { lastActivityAt: now, stampExpiryProcessedAt: null },
      });
    });

    const message = `Verifikasi Fuel Card Cartive: ${code}`;
    const whatsappUrl = `https://wa.me/${contactNumber}?text=${encodeURIComponent(message)}`;
    return Response.json(
      { data: { whatsappUrl, expiresAt }, error: null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    if (error instanceof ConfigurationError) {
      return Response.json(
        { data: null, error: { code: "SERVICE_UNAVAILABLE", message: "Layanan verifikasi belum dikonfigurasi." } },
        { status: 503 },
      );
    }
    throw error;
  }
}
