import { z } from "zod";
import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { deleteOneSignalMember } from "@/lib/external-notifications";
import { databaseUnavailableResponse, isSameOrigin } from "@/lib/security";

const reviewSchema = z.object({
  status: z.enum(["COMPLETED", "DECLINED"]),
  resolution: z.string().trim().min(1).max(500),
}).strict();

type RouteContext = { params: Promise<{ requestId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
    );
  }
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  const { requestId } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(requestId)) {
    return Response.json(
      { data: null, error: { code: "REQUEST_NOT_FOUND", message: "Permintaan data tidak ditemukan." } },
      { status: 404 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { data: null, error: { code: "INVALID_JSON", message: "Catatan tindak lanjut tidak terbaca." } },
      { status: 400 },
    );
  }
  const parsed = reviewSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Status tindak lanjut tidak valid." } },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    if (parsed.data.status === "COMPLETED") {
      const requestToComplete = await db.memberDataRequest.findUnique({
        where: { id: requestId },
        select: { type: true, status: true, memberId: true },
      });
      if (
        requestToComplete?.type === "ERASURE" &&
        (requestToComplete.status === "PENDING" || requestToComplete.status === "IN_REVIEW") &&
        !(await deleteOneSignalMember(requestToComplete.memberId))
      ) {
        return Response.json(
          {
            data: null,
            error: {
              code: "PUSH_DATA_CLEANUP_FAILED",
              message: "Data push belum dapat dihapus dari OneSignal. Permintaan tetap terbuka; periksa konfigurasi lalu coba lagi.",
            },
          },
          { status: 503 },
        );
      }
    }

    const result = await db.$transaction(async (transaction) => {
      const dataRequest = await transaction.memberDataRequest.findUnique({
        where: { id: requestId },
        select: { id: true, type: true, status: true, memberId: true },
      });
      if (!dataRequest) return "not_found" as const;
      if (dataRequest.status !== "PENDING" && dataRequest.status !== "IN_REVIEW") {
        return "closed" as const;
      }

      const now = new Date();
      if (dataRequest.type === "ERASURE" && parsed.data.status === "COMPLETED") {
        const member = await transaction.member.findUnique({
          where: { id: dataRequest.memberId },
          select: { id: true, waNumber: true },
        });
        if (!member) return "member_not_found" as const;

        await transaction.loginChallenge.deleteMany({
          where: { waNumber: member.waNumber },
        });
        await transaction.member.updateMany({
          where: { id: member.id, deletedAt: null },
          data: {
            waNumber: `ANON-${member.id}`,
            waVerifiedAt: null,
            consentPromoAt: null,
            deletedAt: now,
          },
        });
        await transaction.waVerification.deleteMany({
          where: { memberId: member.id },
        });
        await transaction.session.deleteMany({
          where: { memberId: member.id },
        });
      }

      const updated = await transaction.memberDataRequest.updateMany({
        where: {
          id: requestId,
          status: { in: ["PENDING", "IN_REVIEW"] },
        },
        data: {
          status: parsed.data.status,
          resolution: parsed.data.resolution,
          reviewedBy: access.email,
          reviewedAt: now,
        },
      });
      if (updated.count !== 1) return "closed" as const;

      await transaction.adminAuditLog.create({
        data: {
          actorEmail: access.email,
          action: `MEMBER_DATA_REQUEST_${parsed.data.status}`,
          entityType: "MemberDataRequest",
          entityId: requestId,
          metadata: {
            type: dataRequest.type,
            memberId: dataRequest.memberId,
            resolution: parsed.data.resolution,
          },
        },
      });
      return "updated" as const;
    });

    if (result === "not_found") {
      return Response.json(
        { data: null, error: { code: "REQUEST_NOT_FOUND", message: "Permintaan data tidak ditemukan." } },
        { status: 404 },
      );
    }
    if (result === "member_not_found") {
      return Response.json(
        { data: null, error: { code: "MEMBER_NOT_FOUND", message: "Data anggota untuk permintaan ini tidak ditemukan." } },
        { status: 409 },
      );
    }
    if (result === "closed") {
      return Response.json(
        { data: null, error: { code: "REQUEST_ALREADY_CLOSED", message: "Permintaan data sudah ditutup atau sedang diproses admin lain." } },
        { status: 409 },
      );
    }
    return Response.json({ data: { id: requestId, status: parsed.data.status }, error: null });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
