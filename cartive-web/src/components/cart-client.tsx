"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ProductArtwork } from "@/components/product-bottle";
import CoffeeBeanIcon from "@/components/coffee-bean-icon";
import { getCartSnapshot, getServerCartSnapshot, subscribeToCart, writeCart } from "@/lib/cart-storage";
import { getCartSubtotal } from "@/lib/web-cart";
import { useCatalog } from "@/components/use-catalog";

export default function CartClient() {
  const items = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerCartSnapshot);
  const { products: catalog, loading: catalogLoading, error: catalogError } = useCatalog();
  const catalogById = new Map(catalog.map((product) => [product.id, product]));
  const configuredPrices = new Map(catalog.map((product) => [product.id, product.price]));
  const hasUnresolvedItems = items.some((item) => !catalogById.has(item.productId));

  const subtotal = getCartSubtotal(items, configuredPrices);
  function updateQuantity(productId: string, quantity: number) {
    const next = items
      .map((item) => item.productId === productId ? { ...item, quantity } : item)
      .filter((item) => item.quantity > 0);
    writeCart(next);
  }

  return (
    <section className="cart-page section-wrap">
      <Link className="back-link" href="/menu">← Kembali ke menu</Link>
      <p className="eyebrow"><CoffeeBeanIcon className="eyebrow-bean" /> PESANAN WEB</p>
      <h1>Keranjang <em>belanjamu.</em></h1>
      {items.length === 0 ? (
        <div className="cart-empty">
          <CoffeeBeanIcon className="cart-empty-bean" />
          <p>Keranjang masih kosong. Pilih kopi yang ingin kamu nikmati.</p>
          <Link className="button button-primary" href="/menu">Jelajahi menu</Link>
        </div>
      ) : (
        <>
          <div className="cart-coffee-note">
            <CoffeeBeanIcon />
            <span>Pilihan kopi yang pas untuk menemani harimu.</span>
            <Link href="/menu">Tambah varian lain <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="cart-items">
            {items.map((item) => {
              const product = catalogById.get(item.productId);
              if (!product) {
                return (
                  <article className="cart-item" key={item.productId}>
                    <div className="cart-item-info">
                      <h2>
                        {catalogLoading
                          ? "Memuat produk…"
                          : catalogError
                            ? "Katalog belum dapat dimuat"
                            : "Produk tidak lagi tersedia"}
                      </h2>
                      {!catalogLoading && !catalogError && (
                        <button className="cart-remove-button" type="button" onClick={() => updateQuantity(item.productId, 0)}>
                          Hapus dari keranjang
                        </button>
                      )}
                    </div>
                  </article>
                );
              }
              return (
                <article className="cart-item" key={item.productId}>
                  <div className={`cart-item-visual product-visual visual-${product.tone}`}>
                    <ProductArtwork
                      tone={product.tone}
                      imageUrl={product.imageUrl}
                      name={product.name}
                      line={product.line}
                    />
                  </div>
                  <div className="cart-item-info">
                    <p className="product-note">{product.line} · {product.note}</p>
                    <h2>{product.name}</h2>
                    <p>Rp{new Intl.NumberFormat("id-ID").format(product.price)} / botol</p>
                    <button className="cart-remove-button" type="button" onClick={() => updateQuantity(product.id, 0)}>
                      Hapus
                    </button>
                  </div>
                  <div className="cart-item-total">
                    <strong>Rp{new Intl.NumberFormat("id-ID").format(product.price * item.quantity)}</strong>
                    <div className="quantity-stepper" aria-label={`Jumlah ${product.name}`}>
                      <button
                        type="button"
                        aria-label={`Kurangi ${product.name}`}
                        onClick={() => updateQuantity(product.id, item.quantity - 1)}
                      >−</button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Tambah ${product.name}`}
                        onClick={() => updateQuantity(product.id, item.quantity + 1)}
                        disabled={item.quantity >= 20}
                      >+</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="cart-summary">
            <span>Subtotal produk</span>
            <strong>{catalogLoading ? "Memuat…" : `Rp${new Intl.NumberFormat("id-ID").format(subtotal)}`}</strong>
          </div>
          {catalogError && (
            <p className="form-alert form-alert-error" role="alert">
              Katalog gagal dimuat. Muat ulang halaman sebelum melanjutkan agar harga dan ketersediaan terbaru dapat diperiksa.
            </p>
          )}
          <p className="manual-order-disclaimer">
            Ongkir untuk pengantaran dikonfirmasi admin. Pembayaran belum dilakukan pada tahap ini.
          </p>
          {catalogLoading || catalogError || hasUnresolvedItems ? (
            <button className="button button-primary cart-checkout" type="button" disabled>
              {catalogLoading ? "Memuat katalog…" : catalogError ? "Katalog belum tersedia" : "Periksa produk di atas"}
            </button>
          ) : (
            <Link className="button button-primary cart-checkout" href="/checkout">
              Lanjut ke checkout
            </Link>
          )}
        </>
      )}
    </section>
  );
}
