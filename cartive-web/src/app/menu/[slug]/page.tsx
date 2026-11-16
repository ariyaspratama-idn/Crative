import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductBottle from "@/components/product-bottle";
import MobileQuickNav from "@/components/mobile-quick-nav";
import AddToCartButton from "@/components/add-to-cart-button";
import { getProduct, products } from "@/lib/catalog";
import CartLink from "@/components/cart-link";
import CoffeeBeanIcon from "@/components/coffee-bean-icon";
import CatalogPrice from "@/components/catalog-price";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.id }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Produk tidak ditemukan — Cartive" };

  return {
    title: `${product.name} — Menu Cartive`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

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

      <section className="product-page section-wrap">
        <Link className="back-link" href="/menu">← Kembali ke menu</Link>
        <div className="product-page-layout">
          <div className={`product-page-visual product-visual visual-${product.tone}`}>
            <span className={`line-pill line-${product.line.toLowerCase()}`}>{product.line}</span>
            <CoffeeBeanIcon className="product-page-bean product-page-bean-one" />
            <CoffeeBeanIcon className="product-page-bean product-page-bean-two" />
            <ProductBottle tone={product.tone} />
            <span className="product-page-volume">COFFEE · 250 ML</span>
          </div>
          <div className="product-page-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> {product.line.toUpperCase()}</p>
            <h1>{product.name}</h1>
            <p className="product-page-note">{product.note}</p>
            <p className="product-page-description">{product.description}</p>
            <p className="product-page-price">
              <CatalogPrice productId={product.id} defaultPrice={product.price} />
            </p>
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
      <footer className="site-footer">
        <div className="footer-bottom section-wrap">
          <Link href="/menu">← Semua menu</Link>
          <span>MENU CARTIVE · {product.name.toUpperCase()}</span>
        </div>
      </footer>
      <MobileQuickNav active="menu" />
    </main>
  );
}
