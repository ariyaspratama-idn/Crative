"use client";

import Link from "next/link";
import AddToCartButton from "@/components/add-to-cart-button";
import CartLink from "@/components/cart-link";
import CoffeeBeanIcon from "@/components/coffee-bean-icon";
import MobileQuickNav from "@/components/mobile-quick-nav";
import { ProductArtwork } from "@/components/product-bottle";
import { useCatalog } from "@/components/use-catalog";

export default function ProductDetail({ slug }: { slug: string }) {
  const { products, loading, error } = useCatalog();
  const product = products.find((entry) => entry.id === slug);

  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Cartive, ke beranda">
          <span className="wordmark-mark">c.</span>
          <span>cartive</span>
        </Link>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          <Link href="/menu">Menu</Link>
          <Link href="/kartu">Fuel Card</Link>
          <Link href="/cara-kerja">Cara kerja</Link>
        </nav>
        <CartLink />
      </header>
      {product ? (
        <section className="product-page section-wrap">
          <Link className="back-link" href="/menu">← Kembali ke menu</Link>
          <div className="product-page-layout">
            <div className={`product-page-visual product-visual visual-${product.tone}`}>
              <span className="line-pill">{product.line}</span>
              <CoffeeBeanIcon className="product-page-bean product-page-bean-one" />
              <CoffeeBeanIcon className="product-page-bean product-page-bean-two" />
              <ProductArtwork
                tone={product.tone}
                imageUrl={product.imageUrl}
                name={product.name}
                line={product.line}
              />
              <span className="product-page-volume">{product.note.toUpperCase()}</span>
            </div>
            <div className="product-page-copy">
              <p className="eyebrow"><span className="eyebrow-dot" /> {product.line.toUpperCase()}</p>
              <h1>{product.name}</h1>
              <p className="product-page-note">{product.note}</p>
              <p className="product-page-description">{product.description}</p>
              <p className="product-page-price">Rp{new Intl.NumberFormat("id-ID").format(product.price)}</p>
              <p className="product-page-disclaimer">
                Harga acuan. Ketersediaan, ongkir, dan total pesanan dikonfirmasi admin sebelum pembayaran.
              </p>
              <AddToCartButton productId={product.id} />
              <Link className="text-link product-page-back" href="/menu">
                Jelajahi semua varian <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="product-page section-wrap">
          <p className={error ? "form-alert form-alert-error" : "admin-empty"} role={error ? "alert" : "status"}>
            {loading ? "Memuat informasi produk…" : error || "Produk tidak ditemukan atau sudah dihapus dari katalog."}
          </p>
          <Link className="button button-primary" href="/menu">Kembali ke menu</Link>
        </section>
      )}
      <footer className="site-footer">
        <div className="footer-bottom section-wrap">
          <Link href="/menu">← Semua menu</Link>
          <span>{product ? `MENU CARTIVE · ${product.name.toUpperCase()}` : "MENU CARTIVE"}</span>
        </div>
      </footer>
      <MobileQuickNav active="menu" />
    </main>
  );
}
