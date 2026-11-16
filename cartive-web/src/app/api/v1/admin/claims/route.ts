import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { maskWhatsAppNumber } from "@/lib/phone";
import { databaseUnavailableResponse } from "@/lib/security";

const PAGE_SIZE = 25;

export async function GET(request: NextRequest) {
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  const cursor = request.nextUrl.searchParams.get("cursor");
  if (cursor && (cursor.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(cursor))) {
    return Response.json(
      { data: null, error: { code: "INVALID_CURSOR", message: "Antrean tidak dapat dimuat. Segarkan halaman." } },
      { status: 400 },
    );
  }

  try {
    const claims = await getDb().claim.findMany({
      where: { status: "NEEDS_REVIEW" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        platform: true,
        orderId: true,
        claimedBottleCount: true,
        status: true,
        orderedAt: true,
        createdAt: true,
        imageKey: true,
        member: { select: { waNumber: true } },
      },
    });

    const hasMore = claims.length > PAGE_SIZE;
    const page = claims.slice(0, PAGE_SIZE);
    return Response.json(
      {
        data: {
          claims: page.map(({ imageKey, member, ...claim }) => ({
            ...claim,
            memberWa: maskWhatsAppNumber(member.waNumber),
            receiptAvailable: Boolean(imageKey),
          })),
          nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
        },
        error: null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json(
        { data: null, error: { code: "INVALID_CURSOR", message: "Antrean berubah. Muat ulang halaman." } },
        { status: 400 },
      );
    }
    throw error;
  }
}
