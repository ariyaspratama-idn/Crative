import { getDb } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { databaseUnavailableResponse } from "@/lib/security";
import { deleteStoredReceipt } from "@/lib/receipt-storage";

export const maxDuration = 60;

const STAMP_INACTIVITY_DAYS = 90;
const RECEIPT_RETENTION_DAYS = 30;
const AUDIT_RETENTION_DAYS = 365;
const MEMBER_BATCH_SIZE = 100;
const RECEIPT_BATCH_SIZE = 100;

function daysAgo(days: number, now: Date) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) {
    return Response.json(
      { data: null, error: { code: "CRON_NOT_CONFIGURED", message: "Tugas terjadwal belum dikonfigurasi." } },
      { status: 503 },
    );
  }
  if (!isAuthorizedCronRequest(request.headers, secret)) {
    return Response.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Akses tugas terjadwal ditolak." } },
      { status: 401 },
    );
  }

  try {
    const db = getDb();
    const now = new Date();
    const inactiveBefore = daysAgo(STAMP_INACTIVITY_DAYS, now);
    const receiptBefore = daysAgo(RECEIPT_RETENTION_DAYS, now);
    const auditBefore = daysAgo(AUDIT_RETENTION_DAYS, now);

    const inactiveMembers = await db.member.findMany({
      where: {
        deletedAt: null,
        lastActivityAt: { lt: inactiveBefore },
        stampExpiryProcessedAt: null,
      },
      orderBy: { lastActivityAt: "asc" },
      take: MEMBER_BATCH_SIZE,
      select: {
        id: true,
        lastActivityAt: true,
        stampExpiryProcessedAt: true,
      },
    });

    let stampsExpired = 0;
    let memberFailures = 0;
    for (const member of inactiveMembers) {
      try {
        const expired = await db.$transaction(async (transaction) => {
          const processed = await transaction.member.updateMany({
            where: {
              id: member.id,
              deletedAt: null,
              lastActivityAt: member.lastActivityAt,
              stampExpiryProcessedAt: member.stampExpiryProcessedAt,
            },
            data: { stampExpiryProcessedAt: now },
          });
          if (processed.count !== 1) return 0;

          const balance = await transaction.stampLedger.aggregate({
            where: { memberId: member.id },
            _sum: { delta: true },
          });
          const stamps = balance._sum.delta ?? 0;
          if (stamps <= 0) return 0;

          await transaction.stampLedger.create({
            data: {
              memberId: member.id,
              delta: -stamps,
              reason: "EXPIRE",
              refType: "INACTIVITY",
              refId: `${member.id}:${member.lastActivityAt.toISOString()}`,
            },
          });
          await transaction.adminAuditLog.create({
            data: {
              actorEmail: "system:retention",
              action: "STAMPS_EXPIRED",
              entityType: "Member",
              entityId: member.id,
              metadata: {
                stampsExpired: stamps,
                lastActivityAt: member.lastActivityAt.toISOString(),
              },
            },
          });
          return stamps;
        });
        stampsExpired += expired;
      } catch (error) {
        memberFailures += 1;
        console.error("Stamp expiry failed for a member.", {
          memberId: member.id,
          error,
        });
      }
    }

    const expiredReceipts = await db.claim.findMany({
      where: {
        status: { in: ["APPROVED", "REJECTED"] },
        reviewedAt: { lte: receiptBefore },
        imageKey: { not: null },
      },
      orderBy: { reviewedAt: "asc" },
      take: RECEIPT_BATCH_SIZE,
      select: { id: true, imageKey: true },
    });

    let receiptsDeleted = 0;
    let receiptFailures = 0;
    for (const claim of expiredReceipts) {
      if (!claim.imageKey) continue;
      try {
        await deleteStoredReceipt(claim.imageKey);
        const deleted = await db.$transaction(async (transaction) => {
          const updated = await transaction.claim.updateMany({
            where: { id: claim.id, imageKey: claim.imageKey },
            data: { imageKey: null },
          });
          if (updated.count !== 1) return 0;

          await transaction.adminAuditLog.create({
            data: {
              actorEmail: "system:retention",
              action: "CLAIM_RECEIPT_PURGED",
              entityType: "Claim",
              entityId: claim.id,
              metadata: { retentionDays: RECEIPT_RETENTION_DAYS },
            },
          });
          return 1;
        });
        receiptsDeleted += deleted;
      } catch (error) {
        receiptFailures += 1;
        console.error("Receipt retention failed for a claim.", {
          claimId: claim.id,
          error,
        });
      }
    }

    const expiredPaymentProofs = await db.webOrder.findMany({
      where: {
        status: { in: ["COMPLETED", "CANCELLED"] },
        statusUpdatedAt: { lte: receiptBefore },
        paymentProofKey: { not: null },
      },
      orderBy: { statusUpdatedAt: "asc" },
      take: RECEIPT_BATCH_SIZE,
      select: { id: true, paymentProofKey: true },
    });

    let paymentProofsDeleted = 0;
    let paymentProofFailures = 0;
    for (const order of expiredPaymentProofs) {
      if (!order.paymentProofKey) continue;
      try {
        await deleteStoredReceipt(order.paymentProofKey);
        const deleted = await db.$transaction(async (transaction) => {
          const updated = await transaction.webOrder.updateMany({
            where: {
              id: order.id,
              paymentProofKey: order.paymentProofKey,
            },
            data: { paymentProofKey: null, paymentProofHash: null },
          });
          if (updated.count !== 1) return 0;

          await transaction.adminAuditLog.create({
            data: {
              actorEmail: "system:retention",
              action: "ORDER_PAYMENT_PROOF_PURGED",
              entityType: "WebOrder",
              entityId: order.id,
              metadata: { retentionDays: RECEIPT_RETENTION_DAYS },
            },
          });
          return 1;
        });
        paymentProofsDeleted += deleted;
      } catch (error) {
        paymentProofFailures += 1;
        console.error("Order payment proof retention failed.", {
          orderId: order.id,
          error,
        });
      }
    }

    const oldAuditLogs = await db.adminAuditLog.deleteMany({
      where: { createdAt: { lt: auditBefore } },
    });
    const oldRateLimitBuckets = await db.rateLimitBucket.deleteMany({
      where: { updatedAt: { lt: daysAgo(30, now) } },
    });
    const expiredRewards = await db.reward.updateMany({
      where: { status: "AVAILABLE", expiresAt: { lte: now } },
      data: { status: "EXPIRED" },
    });
    const expiredLoginChallenges = await db.loginChallenge.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    const failures = memberFailures + receiptFailures + paymentProofFailures;

    return Response.json(
      {
        data: {
          membersChecked: inactiveMembers.length,
          stampsExpired,
          receiptsChecked: expiredReceipts.length,
          receiptsDeleted,
          paymentProofsChecked: expiredPaymentProofs.length,
          paymentProofsDeleted,
          auditLogsDeleted: oldAuditLogs.count,
          rateLimitBucketsDeleted: oldRateLimitBuckets.count,
          rewardsExpired: expiredRewards.count,
          loginChallengesDeleted: expiredLoginChallenges.count,
          failures,
        },
        error: failures
          ? { code: "PARTIAL_MAINTENANCE_FAILURE", message: "Sebagian tugas retensi gagal dan akan dicoba ulang pada jadwal berikutnya." }
          : null,
      },
      {
        status: failures ? 503 : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    if (error instanceof Error && error.name === "StorageError") {
      return Response.json(
        { data: null, error: { code: "STORAGE_UNAVAILABLE", message: "Penyimpanan struk tidak tersedia untuk tugas retensi." } },
        { status: 503 },
      );
    }
    throw error;
  }
}
