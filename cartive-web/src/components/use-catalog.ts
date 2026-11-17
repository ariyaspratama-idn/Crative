"use client";

import { useEffect, useState } from "react";
import { products, type CatalogProduct } from "@/lib/catalog";

export type StoreCatalogProduct = Omit<CatalogProduct, "price"> & {
  price: number;
  isActive: boolean;
  quantityAvailable: number | null;
  imageUrl: string | null;
};

type CatalogResponse = {
  data: Array<{
    id: string;
    name: string;
    line: string;
    description: string;
    note: string;
    tone: string;
    price: number;
    isActive: boolean;
    quantityAvailable: number;
    imageUrl: string | null;
  }> | null;
  error: { message: string } | null;
};

export function useCatalog() {
  const [catalog, setCatalog] = useState<StoreCatalogProduct[]>(() =>
    products.map((product) => ({
      ...product,
      isActive: true,
      quantityAvailable: null,
      imageUrl: null,
    })),
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
        if (active) {
          setCatalog(body.data);
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
