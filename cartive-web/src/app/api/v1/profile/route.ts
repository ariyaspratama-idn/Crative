import { z } from "zod";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentMember } from "@/lib/member-session";
import { databaseUnavailableResponse, isSameOrigin } from "@/lib/security";

const preferenceSchema = z.object({
  consentPromo: z.boolean(),
}).strict();

export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return Response.json(
        { data: null, error: { code: "UNAUTHENTICATED", message: "Masuk untuk membuka pengaturan profil." } },
        { status: 401 },
      );
    }

    const profile = await getDb().member.findUnique({
      where: { id: member.id },
      select: {
        waNumber: true,
        waVerifiedAt: true,
        consentPrivacyAt: true,
        consentPromoAt: true,
        createdAt: true,
        dataRequests: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            type: true,
            status: true,
            details: true,
            resolution: true,
            createdAt: true,
            reviewedAt: true,
          },
        },
      },
    });

    if (!profile) {
      return Response.json(
        { data: null, error: { code: "PROFILE_NOT_FOUND", message: "Profil tidak ditemukan." } },
        { status: 404 },
      );
    }

    return Response.json({
      data: {
        waNumber: profile.waNumber,
        waVerified: Boolean(profile.waVerifiedAt),
        consentPrivacyAt: profile.consentPrivacyAt,
        consentPromo: Boolean(profile.consentPromoAt),
        createdAt: profile.createdAt,
        dataRequests: profile.dataRequests,
      },
      error: null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
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
      { data: null, error: { code: "INVALID_JSON", message: "Pengaturan profil tidak terbaca." } },
      { status: 400 },
    );
  }

  const parsed = preferenceSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: "Pilihan promosi tidak valid." } },
      { status: 400 },
    );
  }

  try {
    const member = await getCurrentMember();
    if (!member) {
      return Response.json(
        { data: null, error: { code: "UNAUTHENTICATED", message: "Masuk untuk mengubah pengaturan profil." } },
        { status: 401 },
      );
    }

    const now = new Date();
    await getDb().member.update({
      where: { id: member.id },
      data: {
        consentPromoAt: parsed.data.consentPromo ? now : null,
        lastActivityAt: now,
        stampExpiryProcessedAt: null,
      },
    });
    return Response.json({
      data: { consentPromo: parsed.data.consentPromo },
      error: null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
