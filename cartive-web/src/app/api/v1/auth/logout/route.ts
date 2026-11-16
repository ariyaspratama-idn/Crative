import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { databaseUnavailableResponse, hashToken, isSameOrigin, SESSION_COOKIE } from "@/lib/security";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  try {
    if (token) {
      const db = getDb();
      await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    }
    cookieStore.delete(SESSION_COOKIE);
    return Response.json({ data: { signedOut: true }, error: null });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
