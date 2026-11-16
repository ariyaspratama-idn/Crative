import type { Metadata } from "next";
import Link from "next/link";
import CheckoutClient from "@/components/checkout-client";
import MobileQuickNav from "@/components/mobile-quick-nav";

export const metadata: Metadata = {
  title: "Checkout — Cartive",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
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
        </nav>
      </header>
      <CheckoutClient />
      <footer className="site-footer">
        <div className="footer-bottom section-wrap">
          <Link href="/keranjang">← Keranjang</Link>
          <span>CHECKOUT CARTIVE</span>
        </div>
      </footer>
      <MobileQuickNav active="pesanan" />
    </main>
  );
}
