import { getDb } from "@/lib/db";
import { getCurrentMember } from "@/lib/member-session";
import { maskWhatsAppNumber } from "@/lib/phone";
import { databaseUnavailableResponse } from "@/lib/security";

export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return Response.json(
        { data: null, error: { code: "UNAUTHENTICATED", message: "Masuk untuk membuka Fuel Card." } },
        { status: 401 },
      );
    }

    const db = getDb();
    const [balance, claimCount] = await Promise.all([
      db.stampLedger.aggregate({
        where: { memberId: member.id },
        _sum: { delta: true },
      }),
      db.claim.count({ where: { memberId: member.id } }),
    ]);

    const stamps = Math.max(0, balance._sum.delta ?? 0);
    return Response.json({
      data: {
        id: member.id,
        waNumber: maskWhatsAppNumber(member.waNumber),
        waVerified: Boolean(member.waVerifiedAt),
        stamps,
        progressToBottle: stamps % 7,
        claimCount,
      },
      error: null,
    });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
