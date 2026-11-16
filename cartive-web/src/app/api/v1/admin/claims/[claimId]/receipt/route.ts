import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { databaseUnavailableResponse } from "@/lib/security";
import { disposeStorageClient, readPrivateReceipt } from "@/lib/receipt-storage";

type RouteContext = { params: Promise<{ claimId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const access = await authorizeAdmin(request.headers);
  if ("response" in access) return access.response;

  const { claimId } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(claimId)) {
    return Response.json(
      { data: null, error: { code: "CLAIM_NOT_FOUND", message: "Struk tidak ditemukan." } },
      { status: 404 },
    );
  }

  try {
    const claim = await getDb().claim.findUnique({
      where: { id: claimId },
      select: { imageKey: true },
    });
    if (!claim?.imageKey) {
      return Response.json(
        { data: null, error: { code: "RECEIPT_NOT_FOUND", message: "Struk tidak tersedia." } },
        { status: 404 },
      );
    }

    const receipt = await readPrivateReceipt(claim.imageKey);
    try {
      return new Response(receipt.body, {
        headers: {
          "Content-Type": "image/webp",
          "Content-Disposition": "inline; filename=\"receipt.webp\"",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } finally {
      disposeStorageClient(receipt.client);
    }
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    if (error instanceof Error && error.name === "StorageError") {
      return Response.json(
        { data: null, error: { code: "RECEIPT_UNAVAILABLE", message: "Struk belum dapat ditampilkan." } },
        { status: 503 },
      );
    }
    throw error;
  }
}
