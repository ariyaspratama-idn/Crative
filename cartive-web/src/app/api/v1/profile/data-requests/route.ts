import { z } from "zod";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentMember } from "@/lib/member-session";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  ConfigurationError,
  databaseUnavailableResponse,
  isSameOrigin,
} from "@/lib/security";

const requestSchema = z.object({
  type: z.enum(["ACCESS", "RECTIFICATION", "ERASURE"]),
  details: z.string().trim().max(500).optional(),
  confirmErasure: z.boolean().optional(),
}).strict().superRefine((request, context) => {
  if (request.type === "ERASURE" && request.confirmErasure !== true) {
    context.addIssue({
      code: "custom",
      path: ["confirmErasure"],
      message: "Konfirmasi permintaan penghapusan data terlebih dahulu.",
    });
  }
});

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
      { data: null, error: { code: "INVALID_JSON", message: "Permintaan data tidak terbaca." } },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Permintaan data tidak valid." } },
      { status: 400 },
    );
  }

  try {
    const member = await getCurrentMember();
    if (!member) {
      return Response.json(
        { data: null, error: { code: "UNAUTHENTICATED", message: "Masuk untuk mengajukan permintaan data." } },
        { status: 401 },
      );
    }

    const limit = await consumeRateLimit(
      "member-data-request",
      member.id,
      24 * 60 * 60 * 1000,
      3,
    );
    if (!limit.allowed) {
      return Response.json(
        { data: null, error: { code: "RATE_LIMITED", message: "Batas permintaan data hari ini tercapai. Coba lagi besok." } },
        { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)) } },
      );
    }

    const db = getDb();
    const result = await db.$transaction(async (transaction) => {
      const dataRequest = await transaction.memberDataRequest.create({
        data: {
          memberId: member.id,
          type: parsed.data.type,
          details: parsed.data.details || null,
        },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
        },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorEmail: "system:member-data-request",
          action: "MEMBER_DATA_REQUESTED",
          entityType: "MemberDataRequest",
          entityId: dataRequest.id,
          metadata: { type: dataRequest.type, memberId: member.id },
        },
      });
      return dataRequest;
    });

    return Response.json(
      { data: result, error: null },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    if (error instanceof ConfigurationError) {
      return Response.json(
        { data: null, error: { code: "SERVICE_UNAVAILABLE", message: "Layanan permintaan data belum dikonfigurasi." } },
        { status: 503 },
      );
    }
    throw error;
  }
}
