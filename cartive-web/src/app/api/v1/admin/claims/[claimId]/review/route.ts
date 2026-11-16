import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { sendClaimReviewPush } from "@/lib/external-notifications";
import { databaseUnavailableResponse, isSameOrigin } from "@/lib/security";

const rejectionReasons = [
  "ORDER_NOT_FOUND",
  "ORDER_ID_MISMATCH",
  "RECEIPT_UNREADABLE",
  "BOTTLE_COUNT_MISMATCH",
  "OUTSIDE_CLAIM_WINDOW",
  "OTHER",
] as const;

const reviewSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("APPROVE") }).strict(),
  z.object({
    decision: z.literal("REJECT"),
    reasonCode: z.enum(rejectionReasons),
    reasonNote: z.string().trim().max(250).optional(),
  }).strict().superRefine((value, context) => {
    if (value.reasonCode === "OTHER" && !value.reasonNote) {
      context.addIssue({
        code: "custom",
        path: ["reasonNote"],
        message: "Jelaskan alasan penolakan lainnya.",
      });
    }
  }),
]);

type RouteContext = { params: Promise<{ claimId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
    );
  }

  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  const { claimId } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(claimId)) {
    return Response.json(
      { data: null, error: { code: "CLAIM_NOT_FOUND", message: "Klaim tidak ditemukan." } },
      { status: 404 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { data: null, error: { code: "INVALID_JSON", message: "Data keputusan tidak terbaca." } },
      { status: 400 },
    );
  }

  const parsed = reviewSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Keputusan review tidak valid." } },
      { status: 400 },
    );
  }

  try {
    const outcome = await getDb().$transaction(async (transaction) => {
      const claim = await transaction.claim.findUnique({
        where: { id: claimId },
        select: { id: true, memberId: true, claimedBottleCount: true, status: true, imageHash: true },
      });
      if (!claim) return { result: "not_found" as const };
      if (claim.status !== "NEEDS_REVIEW") return { result: "already_reviewed" as const };

      const rejection =
        parsed.data.decision === "REJECT" ? parsed.data : null;
      const nextStatus: "APPROVED" | "REJECTED" = rejection ? "REJECTED" : "APPROVED";
      const reviewedAt = new Date();
      const updated = await transaction.claim.updateMany({
        where: { id: claimId, status: "NEEDS_REVIEW" },
        data: {
          status: nextStatus,
          reviewedBy: access.email,
          reviewedAt,
          reasonCode: rejection?.reasonCode ?? null,
          ...(rejection ? { dedupeKey: null } : {}),
        },
      });
      if (updated.count !== 1) return { result: "already_reviewed" as const };

      if (rejection && claim.imageHash) {
        const reservation = await transaction.claimReceiptFingerprint.findUnique({
          where: { imageHash: claim.imageHash },
          select: { claimId: true },
        });
        if (reservation?.claimId === claim.id) {
          const replacement = await transaction.claim.findFirst({
            where: {
              id: { not: claim.id },
              imageHash: claim.imageHash,
              status: { not: "REJECTED" },
            },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          });
          if (replacement) {
            await transaction.claimReceiptFingerprint.update({
              where: { imageHash: claim.imageHash },
              data: { claimId: replacement.id },
            });
          } else {
            await transaction.claimReceiptFingerprint.deleteMany({
              where: { imageHash: claim.imageHash, claimId: claim.id },
            });
          }
        }
      } else if (!rejection) {
        await transaction.stampLedger.create({
          data: {
            memberId: claim.memberId,
            delta: claim.claimedBottleCount,
            reason: "CLAIM",
            refType: "CLAIM",
            refId: claim.id,
          },
        });
        await transaction.member.update({
          where: { id: claim.memberId },
          data: {
            lastActivityAt: reviewedAt,
            stampExpiryProcessedAt: null,
          },
        });
      }

      await transaction.adminAuditLog.create({
        data: {
          actorEmail: access.email,
          action: rejection ? "CLAIM_REJECTED" : "CLAIM_APPROVED",
          entityType: "Claim",
          entityId: claim.id,
          metadata: rejection
            ? {
                reasonCode: rejection.reasonCode,
                ...(rejection.reasonNote ? { reasonNote: rejection.reasonNote } : {}),
              }
            : { stampsAdded: claim.claimedBottleCount },
        },
      });

      return {
        result: "reviewed" as const,
        memberId: claim.memberId,
        status: nextStatus,
        stampsAdded: rejection ? 0 : claim.claimedBottleCount,
      };
    });

    if (outcome.result === "not_found") {
      return Response.json(
        { data: null, error: { code: "CLAIM_NOT_FOUND", message: "Klaim tidak ditemukan." } },
        { status: 404 },
      );
    }
    if (outcome.result === "already_reviewed") {
      return Response.json(
        { data: null, error: { code: "CLAIM_ALREADY_REVIEWED", message: "Klaim sudah diproses atau tidak lagi menunggu pemeriksaan." } },
        { status: 409 },
      );
    }

    await sendClaimReviewPush(
      outcome.memberId,
      outcome.status,
      outcome.stampsAdded,
    );
    return Response.json({
      data: {
        id: claimId,
        status: outcome.status,
        stampsAdded: outcome.stampsAdded,
      },
      error: null,
    });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { data: null, error: { code: "CLAIM_ALREADY_REVIEWED", message: "Klaim atau stamp dari klaim ini sudah tercatat." } },
        { status: 409 },
      );
    }
    throw error;
  }
}
