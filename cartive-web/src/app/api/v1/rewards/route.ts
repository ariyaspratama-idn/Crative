import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { getCurrentMember } from "@/lib/member-session";
import { createRewardCode, rewardStampCosts, REWARD_LIFETIME_MS } from "@/lib/rewards";
import {
  ConfigurationError,
  databaseUnavailableResponse,
  isSameOrigin,
} from "@/lib/security";

const rewardRequestSchema = z.object({
  type: z.enum(["VOUCHER_2K", "FREE_BOTTLE"]),
}).strict();

export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return Response.json(
        { data: null, error: { code: "UNAUTHENTICATED", message: "Masuk untuk melihat hadiah Fuel Card." } },
        { status: 401 },
      );
    }

    const db = getDb();
    const now = new Date();
    await db.reward.updateMany({
      where: { memberId: member.id, status: "AVAILABLE", expiresAt: { lte: now } },
      data: { status: "EXPIRED" },
    });
    const rewards = await db.reward.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        code: true,
        status: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
      },
    });
    return Response.json({ data: rewards, error: null }, {
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
      { data: null, error: { code: "INVALID_JSON", message: "Data hadiah tidak terbaca." } },
      { status: 400 },
    );
  }

  const parsed = rewardRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: "Pilih hadiah yang valid." } },
      { status: 400 },
    );
  }

  try {
    const member = await getCurrentMember();
    if (!member) {
      return Response.json(
        { data: null, error: { code: "UNAUTHENTICATED", message: "Masuk untuk menukar hadiah." } },
        { status: 401 },
      );
    }

    const db = getDb();
    const now = new Date();
    const outcome = await db.$transaction(async (transaction) => {
      const locked = await transaction.member.updateMany({
        where: { id: member.id, deletedAt: null },
        data: { lastActivityAt: now, stampExpiryProcessedAt: null },
      });
      if (locked.count !== 1) return { result: "member_not_found" as const };

      const currentMember = await transaction.member.findUnique({
        where: { id: member.id },
        select: { waVerifiedAt: true },
      });
      if (!currentMember?.waVerifiedAt) return { result: "not_verified" as const };

      const balance = await transaction.stampLedger.aggregate({
        where: { memberId: member.id },
        _sum: { delta: true },
      });
      const stamps = Math.max(0, balance._sum.delta ?? 0);
      const cost = rewardStampCosts[parsed.data.type];
      if (stamps < cost) {
        return { result: "insufficient_stamps" as const, stamps, cost };
      }

      let reward: {
        id: string;
        type: "VOUCHER_2K" | "FREE_BOTTLE";
        code: string;
        status: "AVAILABLE" | "USED" | "EXPIRED";
        expiresAt: Date | null;
        createdAt: Date;
      } | null = null;
      for (let attempt = 0; attempt < 3 && !reward; attempt += 1) {
        try {
          reward = await transaction.reward.create({
            data: {
              memberId: member.id,
              type: parsed.data.type,
              code: createRewardCode(),
              expiresAt: new Date(now.getTime() + REWARD_LIFETIME_MS),
            },
            select: {
              id: true,
              type: true,
              code: true,
              status: true,
              expiresAt: true,
              createdAt: true,
            },
          });
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
            throw error;
          }
          if (attempt === 2) throw error;
        }
      }
      if (!reward) throw new Error("Kode reward tidak dapat dibuat setelah beberapa percobaan.");
      await transaction.stampLedger.create({
        data: {
          memberId: member.id,
          delta: -cost,
          reason: "REDEEM",
          refType: "REWARD",
          refId: reward.id,
        },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorEmail: "system:reward",
          action: "REWARD_ISSUED",
          entityType: "Reward",
          entityId: reward.id,
          metadata: { type: reward.type, stampsSpent: cost },
        },
      });
      return { result: "issued" as const, reward, stampsRemaining: stamps - cost };
    });

    if (outcome.result === "member_not_found") {
      return Response.json(
        { data: null, error: { code: "MEMBER_NOT_FOUND", message: "Akun Fuel Card tidak ditemukan." } },
        { status: 404 },
      );
    }
    if (outcome.result === "not_verified") {
      return Response.json(
        { data: null, error: { code: "WHATSAPP_NOT_VERIFIED", message: "Verifikasi WhatsApp sebelum menukar hadiah." } },
        { status: 403 },
      );
    }
    if (outcome.result === "insufficient_stamps") {
      return Response.json(
        { data: { stamps: outcome.stamps, required: outcome.cost }, error: { code: "INSUFFICIENT_STAMPS", message: `Hadiah ini memerlukan ${outcome.cost} stamp.` } },
        { status: 409 },
      );
    }
    return Response.json(
      { data: outcome, error: null },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    if (error instanceof ConfigurationError) {
      return Response.json(
        { data: null, error: { code: "SERVICE_UNAVAILABLE", message: "Layanan reward belum dikonfigurasi." } },
        { status: 503 },
      );
    }
    throw error;
  }
}
