"use client";

import { useState } from "react";
import Link from "next/link";
import { products } from "@/lib/catalog";
import ProductBottle from "@/components/product-bottle";
import ProductAddButton from "@/components/product-add-button";
import CartLink from "@/components/cart-link";
import CoffeeBeanIcon from "@/components/coffee-bean-icon";
import { useTheme } from "@/components/theme-provider";
import { useCatalog } from "@/components/use-catalog";

type Line = (typeof products)[number]["line"];
type Filter = "Semua" | Line;
const currency = new Intl.NumberFormat("id-ID");

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M4.167 10h11.666M10 4.167 15.833 10 10 15.833" />
    </svg>
  );
}

function BeanIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={filled ? "bean-icon bean-icon-filled" : "bean-icon"}
      viewBox="0 0 32 32"
      fill="none"
    >
      <path d="M23.8 4.8C17.9 1.7 9 6.1 5.3 14.4c-3.1 7 .1 13.1 5.5 13.1 7.3 0 16.3-9.2 16.3-16.3 0-2.8-1.1-5.1-3.3-6.4Z" />
      <path d="M21.5 6.3c-1.1 4.7-3.2 8.7-6.1 12.1-2.2 2.6-4.9 4.8-8.1 6.7" />
    </svg>
  );
}

export default function Home() {
  const [filter, setFilter] = useState<Filter>("Semua");
  const { isDark, toggleTheme } = useTheme();
  const { products: catalog, loading: catalogLoading, error: catalogError } = useCatalog();
  const visibleProducts = catalog.filter((product) => filter === "Semua" || product.line === filter);

  return (
    <main className={isDark ? "site-shell theme-dark" : "site-shell"}>
      <header className="site-header">
        <a className="wordmark" href="#beranda" aria-label="Cartive, ke beranda">
          <span className="wordmark-mark">c.</span>
          <span>cartive</span>
        </a>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          <a href="#menu">Menu</a>
          <a href="/kartu">Fuel Card</a>
          <Link href="/cara-kerja">Cara kerja</Link>
          <a href="#cerita">Cerita kami</a>
          <Link href="/menu">Pesan</Link>
        </nav>
        <div className="header-actions">
          {process.env.NODE_ENV === "development" && (
            <Link className="admin-dev-link" href="/admin">Admin lokal</Link>
          )}
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
            title={isDark ? "Tema terang" : "Tema gelap"}
          >
            <span aria-hidden="true">{isDark ? "☼" : "◐"}</span>
          </button>
          <CartLink />
        </div>
      </header>

      <section className="hero section-wrap" id="beranda">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> KOPI BOTOL, TEMAN JALAN</p>
          <h1>
            Isi ulang
            <br />
            <span>energi baikmu.</span>
          </h1>
          <p className="hero-description">
            Kopi siap minum yang diracik untuk menemani ide, kerja, dan jeda kecil di tengah harimu.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#menu">
              Lihat menu <ArrowIcon />
            </a>
            <a className="text-link" href="/keranjang">
              Lihat keranjang <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="hero-footnote">
            <span className="tiny-stars" aria-hidden="true">✳</span>
            <span>Diracik segar · Disimpan dingin · 250 ml</span>
          </div>
        </div>
        <div className="hero-art" aria-label="Ilustrasi botol kopi Cartive">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="hero-sun" />
          <div className="hero-sticker">
            <span>GOOD</span>
            <span>ENERGY</span>
            <span className="sticker-star">✳</span>
          </div>
          <ProductBottle tone="espresso" />
          <div className="art-caption"><span>01 / 06</span><span>REKA CLASSIC</span></div>
        </div>
        <div className="hero-bottom">
          <span>GULIR UNTUK MENJELAJAH</span>
          <span className="scroll-line" />
          <span>01 — 04</span>
        </div>
      </section>

      <section className="menu-section section-wrap" id="menu">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PILIH TEMAN HARI INI</p>
            <h2>Menu yang punya <em>karakter.</em></h2>
          </div>
          <p className="section-intro">
            Dua suasana, satu botol yang pas untuk caramu menjalani hari.
          </p>
          <Link className="text-link menu-all-link" href="/menu">
            Jelajahi semua menu <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="menu-toolbar">
          <div className="filter-tabs" role="group" aria-label="Filter lini menu">
            {(["Semua", "Reka", "Sela"] as Filter[]).map((item) => (
              <button
                type="button"
                key={item}
                className={filter === item ? "filter-tab active" : "filter-tab"}
                onClick={() => setFilter(item)}
                aria-pressed={filter === item}
              >
                {item}
                {item !== "Semua" && <span className={`tab-dot tab-dot-${item.toLowerCase()}`} />}
              </button>
            ))}
          </div>
          <span className="menu-count">
            01 — {String(visibleProducts.length).padStart(2, "0")} VARIAN
          </span>
        </div>
        <div className="product-grid">
          {visibleProducts.map((product) => (
            <article className="product-card" key={product.name}>
              <div className={`product-visual visual-${product.tone}`}>
                <span className="product-index">0{products.findIndex((entry) => entry.id === product.id) + 1}</span>
                <span className={`line-pill line-${product.line.toLowerCase()}`}>{product.line}</span>
                <CoffeeBeanIcon className="product-bean-art product-bean-art-one" />
                <CoffeeBeanIcon className="product-bean-art product-bean-art-two" />
                <ProductBottle tone={product.tone} />
                <span className="visual-spark" aria-hidden="true">✳</span>
              </div>
              <div className="product-details">
                <div className="product-title-row">
                  <div>
                    <p className="product-note">{product.note}</p>
                    <h3><Link href={`/menu/${product.id}`}>{product.name}</Link></h3>
                  </div>
                  <span className="product-price">Rp{currency.format(product.price)}</span>
                </div>
                <p className="product-stock-availability" role="status">
                  {catalogError
                    ? "Stok belum dapat diperiksa"
                    : catalogLoading
                      ? "Memeriksa stok…"
                      : !product.isActive
                        ? "Tidak ditawarkan saat ini"
                        : (product.quantityAvailable ?? 0) > 0
                          ? `Tersedia · ${product.quantityAvailable} botol`
                          : "Stok habis"}
                </p>
                <p className="product-description">{product.description}</p>
                <div className="product-card-actions">
                  <Link className="product-link" href={`/menu/${product.id}`}>
                    Detail produk <ArrowIcon />
                  </Link>
                  <ProductAddButton
                    productId={product.id}
                    available={product.isActive ? product.quantityAvailable : 0}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="price-note">Harga web mengikuti acuan awal dokumen bisnis dan dapat diperbarui sebelum toko langsung aktif.</p>
      </section>

      <section className="fuel-section" id="fuel-card">
        <div className="fuel-inner section-wrap">
          <div className="fuel-copy">
            <p className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> SETIAP BOTOL PUNYA CERITA</p>
            <h2>Sedikit demi sedikit,<br /><em>jadi segelas lagi.</em></h2>
            <p>
              Kumpulkan stamp dari setiap botol Cartive. Tiga stamp membuka voucher Rp2.000,
              dan tujuh stamp bisa ditukar dengan satu botol favoritmu.
            </p>
            <Link className="button button-light" href="/cara-kerja">
              Lihat cara kerjanya <ArrowIcon />
            </Link>
            <a className="fuel-card-link" href="/kartu">Sudah punya botol? Buka Fuel Card <span aria-hidden="true">↗</span></a>
            <p className="fuel-availability">Fuel Card digital · Hadiah ditukar melalui web Cartive</p>
          </div>
          <div className="fuel-card" aria-label="Contoh tampilan Fuel Card dengan empat dari tujuh stamp">
            <div className="fuel-card-top">
              <span className="fuel-card-brand">cartive <span>FUEL CARD</span></span>
              <span className="card-spark" aria-hidden="true">✳</span>
            </div>
            <div className="fuel-card-rule" />
            <div className="stamp-grid" aria-hidden="true">
              {Array.from({ length: 7 }, (_, index) => (
                <span className={index < 4 ? "stamp filled" : "stamp"} key={index}>
                  <BeanIcon filled={index < 4} />
                </span>
              ))}
            </div>
            <div className="card-progress-copy">
              <span><strong>4</strong> dari 7 stamp</span>
              <span>3 lagi menuju hadiah</span>
            </div>
            <div className="progress-track"><span /></div>
            <div className="fuel-card-bottom">
              <span>TERUS KUMPULKAN</span>
              <span>01 / 07</span>
            </div>
          </div>
        </div>
      </section>

      <section className="how-section section-wrap" id="cara-kerja">
        <div className="section-heading how-heading">
          <div>
            <p className="eyebrow">MUDAH DARI AWAL</p>
            <h2>Scan. Klaim. <em>Nikmati.</em></h2>
          </div>
          <p className="section-intro">Fuel Card dibuat sederhana supaya kamu bisa kembali ke hal yang lebih penting.</p>
        </div>
        <div className="steps-grid">
          {[
            ["01", "Scan QR", "Pindai QR pada botol Cartive untuk membuka halaman Fuel Card."],
            ["02", "Kirim klaim", "Masukkan order ID dan foto struk pembelian Cartive."],
            ["03", "Kumpulkan stamp", "Stamp masuk setelah klaim disetujui. Pantau progres hadiahmu."],
          ].map(([number, title, copy]) => (
            <article className="step-card" key={number}>
              <span className="step-number">{number}</span>
              <span className="step-icon" aria-hidden="true">{number === "01" ? "⌗" : number === "02" ? "↗" : "✳"}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <div className="coming-note">
          <span className="coming-dot" />
          <p><strong>Fuel Card Cartive tersedia.</strong> Kirim klaim pembelianmu dan pantau status stamp setelah pemeriksaan admin.</p>
        </div>
      </section>

      <section className="story-section section-wrap" id="cerita">
        <div className="story-mark" aria-hidden="true">
          <span>c.</span>
          <span className="story-ring ring-a" />
          <span className="story-ring ring-b" />
        </div>
        <div className="story-copy">
          <p className="eyebrow">CERITA CARTIVE</p>
          <h2>Bahan bakar kecil<br />untuk <em>ide besar.</em></h2>
          <p>
            Cartive lahir dari hal sederhana: kopi yang enak seharusnya mudah dibawa dan
            menemani siapa saja yang sedang mengerjakan sesuatu—atau sekadar ingin menikmati jeda.
          </p>
          <a className="text-link" href="#beranda">Kembali ke atas <span aria-hidden="true">↑</span></a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-main section-wrap">
          <div>
            <a className="wordmark footer-wordmark" href="#beranda"><span className="wordmark-mark">c.</span><span>cartive</span></a>
            <p>Kopi botol untuk mengisi ulang harimu.</p>
          </div>
          <div className="footer-links">
            <a href="#menu">Menu</a>
            <a href="#fuel-card">Fuel Card</a>
            <Link href="/cara-kerja">Cara kerja</Link>
            <Link href="/menu">Pesan kopi</Link>
            <Link href="/syarat">Syarat Fuel Card</Link>
            <Link href="/privasi">Kebijakan Privasi</Link>
            <Link href="/profil">Profil pelanggan</Link>
          </div>
          <span className="footer-location">Dibuat dengan niat baik, di Indonesia.</span>
        </div>
        <div className="footer-bottom section-wrap">
          <span>© 2026 CARTIVE</span>
          <div className="footer-legal-links">
            <Link href="/profil">Profil</Link>
            <span>KEEP IT COOL · ENJOY YOUR MOMENT</span>
          </div>
        </div>
      </footer>

      <nav className="mobile-nav" aria-label="Navigasi cepat">
        <a href="#beranda"><span aria-hidden="true">⌂</span>Beranda</a>
        <Link href="/menu"><span aria-hidden="true">◈</span>Menu</Link>
        <Link className="mobile-nav-main" href="/kartu"><span aria-hidden="true">✳</span>Kartu</Link>
        <Link href="/pesanan"><span aria-hidden="true">↗</span>Pesanan</Link>
        <Link href="/profil"><span aria-hidden="true">○</span>Profil</Link>
      </nav>
    </main>
  );
}
