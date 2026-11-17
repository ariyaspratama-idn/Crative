import { NextRequest } from "next/server";
import { getCatalogProductImageKey } from "@/lib/catalog-settings";
import { readCatalogImage } from "@/lib/catalog-image-storage";
import { getDb } from "@/lib/db";
import { ConfigurationError } from "@/lib/security";

type RouteContext = { params: Promise<{ productId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { productId } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productId)) {
    return new Response(null, { status: 404 });
  }

  try {
    const db = getDb();
    const imageKey = await getCatalogProductImageKey(productId, db);
    if (!imageKey) return new Response(null, { status: 404 });
    const image = await readCatalogImage(imageKey);
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(image.byteLength),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ConfigurationError) return new Response(null, { status: 503 });
    throw error;
  }
}
