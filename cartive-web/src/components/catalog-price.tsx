"use client";

import { useCatalog } from "@/components/use-catalog";

export default function CatalogPrice({
  productId,
  defaultPrice,
}: {
  productId: string;
  defaultPrice: number;
}) {
  const { products, loading, error } = useCatalog();
  const price = products.find((product) => product.id === productId)?.price ?? defaultPrice;
  const currency = new Intl.NumberFormat("id-ID");

  return (
    <>
      Rp{currency.format(price)} <span>/ botol</span>
      {error && <span className="sr-only"> Harga acuan; pembaruan harga belum tersedia.</span>}
      {loading && <span className="sr-only"> Memuat harga katalog.</span>}
    </>
  );
}
