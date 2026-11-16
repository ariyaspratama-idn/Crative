import { products, type ProductId } from "./catalog";

export type CartItem = { productId: ProductId; quantity: number };

export function normalizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  const quantities = new Map<ProductId, number>();
  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("productId" in item) ||
      !("quantity" in item)
    ) {
      continue;
    }

    const candidate = item as { productId: unknown; quantity: unknown };
    const product = products.find((entry) => entry.id === candidate.productId);
    if (!product || !Number.isInteger(candidate.quantity) || typeof candidate.quantity !== "number") {
      continue;
    }

    const quantity = Math.min(20, Math.max(0, candidate.quantity));
    if (quantity > 0) quantities.set(product.id, Math.min(20, (quantities.get(product.id) ?? 0) + quantity));
  }

  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}

export function getCartSubtotal(
  items: CartItem[],
  configuredPrices?: ReadonlyMap<string, number>,
) {
  return items.reduce((subtotal, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const price = configuredPrices?.get(item.productId) ?? product?.price ?? 0;
    return subtotal + price * item.quantity;
  }, 0);
}
