"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  getCartSnapshot,
  getServerCartSnapshot,
  subscribeToCart,
} from "@/lib/cart-storage";

export default function CartLink({ className = "header-cta" }: { className?: string }) {
  const items = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const count = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <Link
      className={`cart-link ${className}`.trim()}
      href="/keranjang"
      aria-label={count ? `Keranjang, ${count} botol` : "Keranjang belanja"}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <path d="M3.5 4.5h2l2.1 10.1a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 1.9-1.4l1.5-6.3H7" />
        <circle cx="10" cy="20" r="1.25" />
        <circle cx="18" cy="20" r="1.25" />
      </svg>
      <span>Keranjang</span>
      <span className="cart-link-count" aria-live="polite">{count}</span>
    </Link>
  );
}
