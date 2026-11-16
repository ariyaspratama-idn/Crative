import { z } from "zod";
import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { maskWhatsAppNumber } from "@/lib/phone";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  ConfigurationError,
  databaseUnavailableResponse,
  isSameOrigin,
} from "@/lib/security";

const redeemSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^(?:[A-HJ-NP-Z2-9]{6}|[A-F0-9]{16})$/),
}).strict();

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
    );
  }

  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { data: null, error: { code: "INVALID_JSON", message: "Kode reward tidak terbaca." } },
      { status: 400 },
    );
  }

  const parsed = redeemSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: "Masukkan kode reward 6 karakter yang masih berlaku." } },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const limit = await consumeRateLimit(
      "reward-redeem-admin",
      access.email,
      10 * 60 * 1000,
      10,
    );
    if (!limit.allowed) {
      return Response.json(
        { data: null, error: { code: "RATE_LIMITED", message: "Terlalu banyak percobaan kode reward. Coba lagi beberapa menit." } },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)) },
        },
      );
    }

    const now = new Date();
    const outcome = await db.$transaction(async (transaction) => {
      const reward = await transaction.reward.findUnique({
        where: { code: parsed.data.code },
        select: {
          id: true,
          type: true,
          status: true,
          expiresAt: true,
          memberId: true,
          member: {
            select: { waNumber: true, deletedAt: true },
          },
        },
      });
      if (!reward || reward.member.deletedAt) return { result: "not_found" as const };

      const locked = await transaction.member.updateMany({
        where: { id: reward.memberId, deletedAt: null },
        data: { lastActivityAt: now, stampExpiryProcessedAt: null },
      });
      if (locked.count !== 1) return { result: "not_found" as const };

      const updated = await transaction.reward.updateMany({
        where: {
          id: reward.id,
          status: "AVAILABLE",
          expiresAt: { gt: now },
        },
        data: { status: "USED", usedAt: now },
      });
      if (updated.count !== 1) return { result: "unavailable" as const };

      await transaction.adminAuditLog.create({
        data: {
          actorEmail: access.email,
          action: "REWARD_REDEEMED",
          entityType: "Reward",
          entityId: reward.id,
          metadata: { type: reward.type },
        },
      });
      return {
        result: "redeemed" as const,
        type: reward.type,
        waNumber: reward.member.waNumber,
      };
    });

    if (outcome.result === "not_found") {
      return Response.json(
        { data: null, error: { code: "REWARD_NOT_FOUND", message: "Kode reward tidak ditemukan." } },
        { status: 404 },
      );
    }
    if (outcome.result === "unavailable") {
      return Response.json(
        { data: null, error: { code: "REWARD_UNAVAILABLE", message: "Kode reward sudah digunakan atau tidak berlaku." } },
        { status: 409 },
      );
    }
    return Response.json({
      data: { type: outcome.type, waNumber: maskWhatsAppNumber(outcome.waNumber), usedAt: now },
      error: null,
    });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    if (error instanceof ConfigurationError) {
      return Response.json(
        { data: null, error: { code: "SERVICE_UNAVAILABLE", message: "Layanan admin belum dikonfigurasi." } },
        { status: 503 },
      );
    }
    throw error;
  }
}
