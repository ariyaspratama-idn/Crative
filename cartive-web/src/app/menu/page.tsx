import type { Metadata } from "next";
import Link from "next/link";
import MenuCatalog from "@/components/menu-catalog";
import MobileQuickNav from "@/components/mobile-quick-nav";
import CartLink from "@/components/cart-link";
import CoffeeBeanIcon from "@/components/coffee-bean-icon";
import CoffeeShopArt from "@/components/coffee-shop-art";

export const metadata: Metadata = {
  title: "Menu Cartive — Reka & Sela",
  description: "Jelajahi enam varian kopi botol Cartive dari lini Reka dan Sela.",
};

export default function MenuPage() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Cartive, ke beranda">
          <span className="wordmark-mark">c.</span>
          <span>cartive</span>
        </Link>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          <Link href="/menu" aria-current="page">Menu</Link>
          <Link href="/kartu">Fuel Card</Link>
          <Link href="/cara-kerja">Cara kerja</Link>
        </nav>
        <div className="header-actions">
          {process.env.NODE_ENV === "development" && (
            <Link className="admin-dev-link" href="/admin">Admin lokal</Link>
          )}
          <CartLink />
        </div>
      </header>

      <section className="menu-page section-wrap">
        <Link className="back-link" href="/">← Kembali ke beranda</Link>
        <section className="menu-coffee-hero" aria-labelledby="menu-hero-title">
          <div className="menu-coffee-copy">
            <p className="eyebrow"><CoffeeBeanIcon /> CARTIVE COFFEE BAR · 250 ML</p>
            <h1 id="menu-hero-title">Ritual kecil,<br /><em>rasa yang tinggal.</em></h1>
            <p>
              Diracik untuk menemani jeda, perjalanan, dan hari-hari yang penuh cerita.
              Pilih karakter kopimu hari ini.
            </p>
            <a className="button button-primary menu-hero-cta" href="#pilih-kopi">
              Lihat racikan kami <span aria-hidden="true">↓</span>
            </a>
            <div className="menu-coffee-signature">
              <span><i /> Diracik segar</span>
              <span><i /> Disimpan dingin</span>
            </div>
          </div>
          <CoffeeShopArt />
          <span className="menu-hero-index">CARTIVE / COFFEE No. 01</span>
        </section>
        <div className="section-heading menu-collection-heading" id="pilih-kopi">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> PILIHAN DARI COFFEE BAR</p>
            <h2>Temukan <em>favoritmu.</em></h2>
          </div>
          <p className="section-intro">
            Reka untuk rasa kopi yang tegas. Sela untuk jeda yang lembut dan creamy.
          </p>
        </div>
        <MenuCatalog />
      </section>
      <footer className="site-footer">
        <div className="footer-bottom section-wrap">
          <Link href="/">← Cartive</Link>
          <span>MENU CARTIVE · Reka & Sela</span>
        </div>
      </footer>
      <MobileQuickNav active="menu" />
    </main>
  );
}
