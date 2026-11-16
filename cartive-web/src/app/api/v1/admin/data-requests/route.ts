import { NextRequest } from "next/server";
import { z } from "zod";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { maskWhatsAppNumber } from "@/lib/phone";
import { databaseUnavailableResponse, isSameOrigin } from "@/lib/security";

const reviewSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
}).strict();

export async function GET(request: NextRequest) {
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  try {
    const requests = await getDb().memberDataRequest.findMany({
      where: { status: { in: ["PENDING", "IN_REVIEW"] } },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        type: true,
        status: true,
        details: true,
        createdAt: true,
        member: { select: { waNumber: true } },
      },
    });

    return Response.json({
      data: requests.map(({ member, ...dataRequest }) => ({
        ...dataRequest,
        memberWa: maskWhatsAppNumber(member.waNumber),
      })),
      error: null,
    }, { headers: { "Cache-Control": "private, no-store" } });
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
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { data: null, error: { code: "INVALID_JSON", message: "Data permintaan tidak terbaca." } },
      { status: 400 },
    );
  }
  const parsed = reviewSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: "ID permintaan data tidak valid." } },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const dataRequest = await db.memberDataRequest.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, status: true, type: true, memberId: true },
    });
    if (!dataRequest) {
      return Response.json(
        { data: null, error: { code: "REQUEST_NOT_FOUND", message: "Permintaan data tidak ditemukan." } },
        { status: 404 },
      );
    }
    if (dataRequest.status !== "PENDING" && dataRequest.status !== "IN_REVIEW") {
      return Response.json(
        { data: null, error: { code: "REQUEST_ALREADY_CLOSED", message: "Permintaan data sudah ditutup." } },
        { status: 409 },
      );
    }

    const updated = await db.$transaction(async (transaction) => {
      const changed = await transaction.memberDataRequest.updateMany({
        where: {
          id: dataRequest.id,
          status: { in: ["PENDING", "IN_REVIEW"] },
        },
        data: {
          status: "IN_REVIEW",
          reviewedBy: access.email,
          reviewedAt: new Date(),
        },
      });
      if (changed.count !== 1) return false;
      await transaction.adminAuditLog.create({
        data: {
          actorEmail: access.email,
          action: "MEMBER_DATA_REQUEST_REVIEW_STARTED",
          entityType: "MemberDataRequest",
          entityId: dataRequest.id,
          metadata: { type: dataRequest.type, memberId: dataRequest.memberId },
        },
      });
      return true;
    });

    if (!updated) {
      return Response.json(
        { data: null, error: { code: "REQUEST_ALREADY_CLOSED", message: "Permintaan data sedang diperbarui admin lain." } },
        { status: 409 },
      );
    }
    return Response.json({ data: { id: dataRequest.id, status: "IN_REVIEW" }, error: null });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
