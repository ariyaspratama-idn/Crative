"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductArtwork } from "@/components/product-bottle";
import ProductAddButton from "@/components/product-add-button";
import CoffeeBeanIcon from "@/components/coffee-bean-icon";
import { useCatalog } from "@/components/use-catalog";

type Line = "Semua" | string;
export default function MenuCatalog() {
  const [selectedLine, setSelectedLine] = useState<Line>("Semua");
  const { products: catalog, loading, error } = useCatalog();
  const visibleProducts = catalog.filter(
    (product) => selectedLine === "Semua" || product.line === selectedLine,
  );
  const lines = [...new Set(catalog.map((product) => product.line))];
  const currency = new Intl.NumberFormat("id-ID");

  return (
    <>
      <div className="menu-page-filters" role="group" aria-label="Filter lini menu">
        {(["Semua", ...lines] as const).map((line) => (
          <button
            className={selectedLine === line ? "filter-tab active" : "filter-tab"}
            type="button"
            aria-pressed={selectedLine === line}
            onClick={() => setSelectedLine(line)}
            key={line}
          >
            {line}
          </button>
        ))}
        <Link className="menu-cart-shortcut" href="/keranjang">
          <span aria-hidden="true">Keranjang</span>
          <span className="sr-only">Buka keranjang</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <path d="M3.5 4.5h2l2.1 10.1a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 1.9-1.4l1.5-6.3H7" />
            <circle cx="10" cy="20" r="1.25" />
            <circle cx="18" cy="20" r="1.25" />
          </svg>
        </Link>
        <span className="menu-count" aria-live="polite">
          MENAMPILKAN {String(visibleProducts.length).padStart(2, "0")} VARIAN
        </span>
      </div>
      <div className="product-grid">
        {visibleProducts.map((product) => {
          const quantityAvailable = product.quantityAvailable;
          return (
          <article className="product-card" key={product.id}>
            <Link
              className={`product-visual visual-${product.tone} product-visual-link`}
              href={`/menu/${product.id}`}
              aria-label={`Lihat detail ${product.name}`}
            >
              <span className="product-index">
                {String(catalog.findIndex((entry) => entry.id === product.id) + 1).padStart(2, "0")}
              </span>
              <span className="line-pill">{product.line}</span>
              <CoffeeBeanIcon className="product-bean-art product-bean-art-one" />
              <CoffeeBeanIcon className="product-bean-art product-bean-art-two" />
              <ProductArtwork
                tone={product.tone}
                imageUrl={product.imageUrl}
                name={product.name}
                line={product.line}
              />
              <span className="visual-spark" aria-hidden="true">✳</span>
            </Link>
            <div className="product-details">
              <div className="product-title-row">
                <div>
                  <p className="product-note">{product.note}</p>
                  <h2><Link href={`/menu/${product.id}`}>{product.name}</Link></h2>
                </div>
                <span className="product-price">Rp{currency.format(product.price)}</span>
              </div>
              <p className="product-stock-availability" role="status">
                {error
                  ? "Ketersediaan belum dapat diperiksa"
                  : loading
                    ? "Memeriksa stok…"
                    : !product.isActive
                      ? "Tidak ditawarkan saat ini"
                      : (quantityAvailable ?? 0) > 0
                        ? `Tersedia · ${quantityAvailable} botol`
                        : "Stok habis"}
              </p>
              <p className="product-description">{product.description}</p>
              <div className="product-card-actions">
                <Link className="product-link" href={`/menu/${product.id}`}>
                  Lihat detail <span aria-hidden="true">↗</span>
                </Link>
                <ProductAddButton
                  productId={product.id}
                  available={product.isActive ? quantityAvailable : 0}
                />
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </>
  );
}
