import type { Metadata } from "next";
import Link from "next/link";
import MobileQuickNav from "@/components/mobile-quick-nav";
import OrdersListClient from "@/components/orders-list-client";

export const metadata: Metadata = {
  title: "Pesanan saya — Cartive",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
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
      <OrdersListClient />
      <footer className="site-footer">
        <div className="footer-bottom section-wrap">
          <Link href="/menu">← Menu</Link>
          <span>PESANAN CARTIVE</span>
        </div>
      </footer>
      <MobileQuickNav active="pesanan" />
    </main>
  );
}
