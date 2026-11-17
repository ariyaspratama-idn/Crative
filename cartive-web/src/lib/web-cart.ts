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
    if (
      typeof candidate.productId !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate.productId) ||
      !Number.isInteger(candidate.quantity) ||
      typeof candidate.quantity !== "number"
    ) {
      continue;
    }

    const quantity = Math.min(20, Math.max(0, candidate.quantity));
    if (quantity > 0) {
      if (!quantities.has(candidate.productId) && quantities.size >= 20) continue;
      quantities.set(
        candidate.productId,
        Math.min(20, (quantities.get(candidate.productId) ?? 0) + quantity),
      );
    }
  }

  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}

export function getCartSubtotal(
  items: CartItem[],
  configuredPrices?: ReadonlyMap<string, number>,
) {
  return items.reduce((subtotal, item) => {
    const defaultProduct = products.find((product) => product.id === item.productId);
    const price = configuredPrices?.get(item.productId) ?? defaultProduct?.price ?? 0;
    return subtotal + price * item.quantity;
  }, 0);
}
