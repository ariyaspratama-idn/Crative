"use client";

import { useEffect, useState } from "react";
import { products, type CatalogProduct } from "@/lib/catalog";

export type StoreCatalogProduct = Omit<CatalogProduct, "price"> & {
  price: number;
  isActive: boolean;
  quantityAvailable: number | null;
};

type CatalogResponse = {
  data: Array<{
    id: string;
    price: number;
    isActive: boolean;
    quantityAvailable: number;
  }> | null;
  error: { message: string } | null;
};

export function useCatalog() {
  const [catalog, setCatalog] = useState<StoreCatalogProduct[]>(() =>
    products.map((product) => ({ ...product, isActive: true, quantityAvailable: null })),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/v1/products", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as CatalogResponse;
        if (!response.ok || body.error || body.data === null) {
          throw new Error(body.error?.message ?? "Katalog belum dapat dimuat.");
        }
        const configured = new Map(body.data.map((product) => [product.id, product]));
        if (active) {
          setCatalog(products.map((product) => {
            const current = configured.get(product.id);
            return {
              ...product,
              price: current?.price ?? product.price,
              isActive: current?.isActive ?? true,
              quantityAvailable: current?.quantityAvailable ?? null,
            };
          }));
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Katalog belum dapat dimuat.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { products: catalog, loading, error };
}
