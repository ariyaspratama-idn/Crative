"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProductId } from "@/lib/catalog";
import ProductAddButton from "@/components/product-add-button";

export default function AddToCartButton({ productId }: { productId: ProductId }) {
  const [stock, setStock] = useState<number | null>(null);
  const [stockError, setStockError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/v1/products", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as {
          data: Array<{ id: string; quantityAvailable: number; isAvailable: boolean }> | null;
          error: { message: string } | null;
        };
        if (!response.ok || body.error || body.data === null) {
          throw new Error(body.error?.message ?? "Stok belum dapat dimuat.");
        }
        const product = body.data.find((item) => item.id === productId);
        if (!product) throw new Error("Informasi stok produk tidak tersedia.");
        if (active) setStock(product.isAvailable ? product.quantityAvailable : 0);
      })
      .catch((error: unknown) => {
        if (active) setStockError(error instanceof Error ? error.message : "Stok belum dapat dimuat.");
      });
    return () => { active = false; };
  }, [productId]);

  return (
    <div className="product-cart-actions">
      <ProductAddButton productId={productId} available={stockError ? null : stock} />
      {stockError && <p className="form-alert form-alert-error" role="alert">{stockError}</p>}
      <Link className="text-link" href="/keranjang">Lihat keranjang <span aria-hidden="true">↗</span></Link>
    </div>
  );
}
