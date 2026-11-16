import { getDb } from "@/lib/db";
import { databaseUnavailableResponse } from "@/lib/security";

export async function GET() {
  try {
    const db = getDb();
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) {
      return Response.json({ status: "unavailable" }, { status: 503 });
    }
    throw error;
  }
}
