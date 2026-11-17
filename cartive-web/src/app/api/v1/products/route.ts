import { getDb } from "@/lib/db";
import { getCatalogProducts } from "@/lib/catalog-settings";
import { databaseUnavailableResponse } from "@/lib/security";

export async function GET() {
  try {
    const now = new Date();
    const db = getDb();
    const catalog = await getCatalogProducts(db);
    const batches = await db.productBatch.findMany({
      where: {
        productId: { in: catalog.map((product) => product.id) },
        isActive: true,
        quantityAvailable: { gt: 0 },
        OR: [{ bestBeforeAt: null }, { bestBeforeAt: { gt: now } }],
      },
      select: { productId: true, quantityAvailable: true },
      });
    const inventory = new Map<string, number>();
    for (const batch of batches) {
      inventory.set(
        batch.productId,
        (inventory.get(batch.productId) ?? 0) + batch.quantityAvailable,
      );
    }

    return Response.json({
      data: catalog.map((product) => ({
        id: product.id,
        name: product.name,
        line: product.line,
        description: product.description,
        note: product.note,
        tone: product.tone,
        price: product.price,
        isActive: product.isActive,
        imageUrl: product.imageUrl,
        quantityAvailable: inventory.get(product.id) ?? 0,
        isAvailable: product.isActive && (inventory.get(product.id) ?? 0) > 0,
      })),
      error: null,
    }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=30" },
    });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}
