import { getDb } from "@/lib/db";
import { products } from "@/lib/catalog";
import { getCatalogProducts } from "@/lib/catalog-settings";
import { databaseUnavailableResponse } from "@/lib/security";

export async function GET() {
  try {
    const now = new Date();
    const db = getDb();
    const [batches, catalog] = await Promise.all([
      db.productBatch.findMany({
      where: {
        productId: { in: products.map((product) => product.id) },
        isActive: true,
        quantityAvailable: { gt: 0 },
        OR: [{ bestBeforeAt: null }, { bestBeforeAt: { gt: now } }],
      },
      select: { productId: true, quantityAvailable: true },
      }),
      getCatalogProducts(db),
    ]);
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
        price: product.price,
        isActive: product.isActive,
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
