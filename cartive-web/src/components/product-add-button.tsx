"use client";

import { useSyncExternalStore } from "react";
import type { ProductId } from "@/lib/catalog";
import {
  getCartSnapshot,
  getServerCartSnapshot,
  readCart,
  subscribeToCart,
  writeCart,
} from "@/lib/cart-storage";

export default function ProductAddButton({
  productId,
  available,
}: {
  productId: ProductId;
  available: number | null;
}) {
  const items = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const quantity = items.find((item) => item.productId === productId)?.quantity ?? 0;
  const unavailable = available === null || available <= quantity || quantity >= 20;

  function addToCart() {
    if (unavailable) return;
    const currentItems = readCart();
    const current = currentItems.find((item) => item.productId === productId);
    writeCart(current
      ? currentItems.map((item) => item.productId === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item)
      : [...currentItems, { productId, quantity: 1 }]);
  }

  return (
    <button
      className="product-add-button"
      type="button"
      onClick={addToCart}
      disabled={unavailable}
      aria-label={
        available === null
          ? "Memeriksa stok"
          : available <= 0
            ? "Stok habis"
            : `Tambah ${productId} ke keranjang`
      }
      title={available === null ? "Memeriksa stok" : available <= 0 ? "Stok habis" : "Tambah satu botol"}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <path d="M3.5 4.5h2l2.1 10.1a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 1.9-1.4l1.5-6.3H7" />
        <path d="M15.5 11v5m-2.5-2.5h5" />
        <circle cx="10" cy="20" r="1.25" />
        <circle cx="18" cy="20" r="1.25" />
      </svg>
      <span className="sr-only">
        {available === null ? "Memeriksa stok" : available <= 0 ? "Stok habis" : "Tambah ke keranjang"}
      </span>
      <span className="product-add-count" aria-live="polite">{quantity}</span>
    </button>
  );
}
