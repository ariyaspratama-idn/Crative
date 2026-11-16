import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { databaseUnavailableResponse } from "@/lib/security";

export async function GET(request: NextRequest) {
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  const entityId = request.nextUrl.searchParams.get("entityId");
  if (entityId && (entityId.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(entityId))) {
    return Response.json(
      { data: null, error: { code: "INVALID_FILTER", message: "Filter audit tidak valid." } },
      { status: 400 },
    );
  }

  try {
    const entries = await getDb().adminAuditLog.findMany({
      where: entityId ? { entityId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        actorEmail: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
    });
    return Response.json(
      { data: entries, error: null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
