"use client";

import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { products as defaultProducts } from "@/lib/catalog";
import { clearCart, getCartSnapshot, getServerCartSnapshot, subscribeToCart } from "@/lib/cart-storage";
import { getCartSubtotal } from "@/lib/web-cart";
import { useCatalog } from "@/components/use-catalog";

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};
type AvailableReward = {
  id: string;
  type: "VOUCHER_2K" | "FREE_BOTTLE";
  code: string;
  status: "AVAILABLE" | "USED" | "EXPIRED";
  expiresAt: string | null;
};

async function readResponse<T>(response: Response) {
  const body = await response.json() as ApiResponse<T>;
  if (!response.ok || body.error || body.data === null) {
    throw new Error(body.error?.message ?? "Permintaan belum dapat diproses.");
  }
  return body.data;
}

export default function CheckoutClient() {
  const router = useRouter();
  const items = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerCartSnapshot);
  const { products: catalog, loading: catalogLoading, error: catalogError } = useCatalog();
  const catalogById = new Map<string, (typeof catalog)[number]>(catalog.map((product) => [product.id, product]));
  const configuredPrices = new Map(catalog.map((product) => [product.id, product.price]));
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [rewards, setRewards] = useState<AvailableReward[]>([]);
  const [rewardsError, setRewardsError] = useState("");
  const [rewardCode, setRewardCode] = useState("");
  const [freeBottleProductId, setFreeBottleProductId] = useState<string>(defaultProducts[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/v1/rewards", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as ApiResponse<AvailableReward[]>;
        if (response.status === 401) {
          if (active) setRewardsError("Masuk ke Fuel Card untuk menggunakan voucher atau hadiah.");
          return;
        }
        if (!response.ok || body.error || body.data === null) {
          throw new Error(body.error?.message ?? "Daftar reward belum dapat dimuat.");
        }
        if (active) setRewards(body.data.filter((reward) => reward.status === "AVAILABLE"));
      })
      .catch((loadError: unknown) => {
        if (active) setRewardsError(loadError instanceof Error ? loadError.message : "Daftar reward belum dapat dimuat.");
      });
    return () => { active = false; };
  }, []);

  const subtotal = getCartSubtotal(items, configuredPrices);
  const selectedReward = rewards.find((reward) => reward.code === rewardCode);
  const activeProducts = catalog.filter((product) => product.isActive);
  const freeProduct =
    activeProducts.find((product) => product.id === freeBottleProductId) ??
    activeProducts[0] ??
    catalog[0];
  const rewardValue = selectedReward?.type === "VOUCHER_2K"
    ? Math.min(2000, subtotal)
    : selectedReward?.type === "FREE_BOTTLE" ? freeProduct.price : 0;
  const displayedSubtotal = subtotal + (selectedReward?.type === "FREE_BOTTLE" ? freeProduct.price : 0);
  const estimatedTotal = displayedSubtotal - rewardValue;
  const unavailableItems = items.filter((item) => !catalogById.get(item.productId)?.isActive);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const order = await readResponse<{ code: string }>(await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillment,
          address: fulfillment === "DELIVERY" ? form.get("address") : undefined,
          note: form.get("note") || undefined,
          rewardCode: rewardCode || undefined,
          freeBottleProductId: selectedReward?.type === "FREE_BOTTLE" ? freeBottleProductId : undefined,
          items,
        }),
      }));
      clearCart();
      router.push(`/pesanan/${order.code}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Pesanan belum dapat dibuat.");
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="checkout-page section-wrap">
        <p className="eyebrow">CHECKOUT CARTIVE</p>
        <h1>Keranjangmu <em>kosong.</em></h1>
        <Link className="button button-primary" href="/menu">Kembali ke menu</Link>
      </section>
    );
  }

  return (
    <section className="checkout-page section-wrap">
      <Link className="back-link" href="/keranjang">← Kembali ke keranjang</Link>
      <p className="eyebrow"><span className="eyebrow-dot" /> CHECKOUT CARTIVE</p>
      <h1>Rincian <em>pesanan.</em></h1>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-fields">
          <label className="manual-order-field">
            Metode penerimaan
            <select
              value={fulfillment}
              onChange={(event) => setFulfillment(event.target.value as "PICKUP" | "DELIVERY")}
            >
              <option value="PICKUP">Ambil sendiri</option>
              <option value="DELIVERY">Diantar</option>
            </select>
          </label>
          {fulfillment === "DELIVERY" && (
            <label className="manual-order-field">
              Alamat pengiriman
              <textarea name="address" autoComplete="street-address" maxLength={400} rows={3} required />
            </label>
          )}
          <label className="manual-order-field">
            Catatan pesanan <span>(opsional)</span>
            <textarea name="note" maxLength={250} rows={2} />
          </label>
          <label className="manual-order-field">
            Voucher atau hadiah
            <select value={rewardCode} onChange={(event) => setRewardCode(event.target.value)}>
              <option value="">Tanpa reward</option>
              {rewards.map((reward) => (
                <option value={reward.code} key={reward.id}>
                  {reward.type === "VOUCHER_2K" ? "Voucher Rp2.000" : "1 botol gratis"} · {reward.code}
                </option>
              ))}
            </select>
          </label>
          {catalogError && (
            <p className="manual-order-disclaimer" role="status">
              Harga atau ketersediaan belum dapat diperbarui. Total final akan dihitung ulang oleh server saat pesanan dibuat.
            </p>
          )}
          {!catalogLoading && unavailableItems.length > 0 && (
            <p className="form-alert form-alert-error" role="alert">
              Produk {unavailableItems.map((item) => catalogById.get(item.productId)?.name ?? item.productId).join(", ")} sedang tidak ditawarkan. Hapus dari keranjang sebelum melanjutkan.
            </p>
          )}
          {selectedReward?.type === "FREE_BOTTLE" && (
            activeProducts.length > 0 ? (
              <label className="manual-order-field">
                Pilih varian botol gratis
                <select value={freeProduct.id} onChange={(event) => setFreeBottleProductId(event.target.value)}>
                  {activeProducts.map((product) => (
                    <option value={product.id} key={product.id}>{product.name}</option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="form-alert form-alert-error" role="alert">Belum ada produk aktif untuk hadiah botol gratis.</p>
            )
          )}
          {rewardsError && <p className="manual-order-disclaimer" role="status">{rewardsError}</p>}
          <p className="manual-order-disclaimer">
            {fulfillment === "DELIVERY"
              ? "Admin akan memeriksa area layanan dan mengonfirmasi ongkir sebelum pembayaran."
              : "Pengambilan dan jadwal disepakati setelah pembayaran dikonfirmasi admin."}
          </p>
          {error && (
            <div className="form-alert form-alert-error" role="alert">
              <p>{error}</p>
              {error.includes("Masuk") && <Link href="/kartu">Masuk / buat Fuel Card</Link>}
            </div>
          )}
          <button className="button button-primary submit-button" type="submit" disabled={busy || catalogLoading || Boolean(catalogError) || unavailableItems.length > 0}>
            {busy
              ? "Membuat pesanan…"
              : catalogLoading
                ? "Memuat katalog…"
                : catalogError
                  ? "Katalog belum tersedia"
                  : unavailableItems.length > 0
                    ? "Periksa produk di atas"
                    : "Buat pesanan"} <span aria-hidden="true">↗</span>
          </button>
        </div>
        <aside className="checkout-summary">
          <h2>Ringkasan</h2>
          {items.map((item) => {
            const product = catalogById.get(item.productId);
            return product ? (
              <div className="checkout-summary-item" key={item.productId}>
                <span>{product.name} × {item.quantity}</span>
                <strong>Rp{new Intl.NumberFormat("id-ID").format(product.price * item.quantity)}</strong>
              </div>
            ) : null;
          })}
          {selectedReward?.type === "FREE_BOTTLE" && (
            <div className="checkout-summary-item">
              <span>{freeProduct.name} · reward gratis</span>
              <strong>Rp{new Intl.NumberFormat("id-ID").format(freeProduct.price)}</strong>
            </div>
          )}
          <div className="checkout-summary-item">
            <span>Subtotal produk</span>
            <strong>Rp{new Intl.NumberFormat("id-ID").format(displayedSubtotal)}</strong>
          </div>
          {rewardValue > 0 && (
            <div className="checkout-summary-item">
              <span>Potongan reward</span>
              <strong>−Rp{new Intl.NumberFormat("id-ID").format(rewardValue)}</strong>
            </div>
          )}
          <div className="cart-summary">
            <span>Subtotal setelah reward</span>
            <strong>Rp{new Intl.NumberFormat("id-ID").format(estimatedTotal)}</strong>
          </div>
          <p>Ongkir, jika ada, akan dikonfirmasi admin dan belum termasuk subtotal.</p>
        </aside>
      </form>
    </section>
  );
}
