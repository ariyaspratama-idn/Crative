"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Order = {
  code: string;
  status: string;
  statusLabel: string;
  fulfillment: "PICKUP" | "DELIVERY";
  deliveryAddress: string | null;
  subtotal: number;
  discount: number;
  deliveryFee: number | null;
  total: number | null;
  paymentProofUploaded: boolean;
  qrisImageUrl: string | null;
  localSimulation: boolean;
  createdAt: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; isReward: boolean }>;
};
type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

async function readResponse<T>(response: Response) {
  const body = await response.json() as ApiResponse<T>;
  if (!response.ok || body.error || body.data === null) {
    throw new Error(body.error?.message ?? "Permintaan belum dapat diproses.");
  }
  return body.data;
}

const steps = [
  ["PAID", "Dibayar"],
  ["PROCESSING", "Diproses"],
  ["READY", "Siap"],
  ["COMPLETED", "Selesai"],
] as const;

export default function OrderStatusClient({ code }: { code: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchOrder = useCallback(async () => {
    return readResponse<Order>(await fetch(`/api/v1/orders/${encodeURIComponent(code)}`, {
      cache: "no-store",
    }));
  }, [code]);

  const loadOrder = useCallback(async () => {
    try {
      setOrder(await fetchOrder());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Pesanan belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [fetchOrder]);

  useEffect(() => {
    let active = true;
    fetchOrder()
      .then((loaded) => { if (active) setOrder(loaded); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Pesanan belum dapat dimuat.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchOrder]);

  async function submitProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("proof");
    if (!(file instanceof File) || file.size === 0 || file.size > 4 * 1024 * 1024) {
      setError("Pilih foto bukti pembayaran yang valid dengan ukuran maksimal 4 MB.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const formData = new FormData(form);
      await readResponse(await fetch(`/api/v1/orders/${encodeURIComponent(code)}/payment-proof`, {
        method: "POST",
        body: formData,
      }));
      setNotice("Bukti pembayaran terkirim dan menunggu pemeriksaan admin.");
      await loadOrder();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Bukti pembayaran belum dapat dikirim.");
    } finally {
      setBusy(false);
    }
  }

  const currency = new Intl.NumberFormat("id-ID");
  return (
    <section className="order-status-page section-wrap">
      <Link className="back-link" href="/menu">← Kembali ke menu</Link>
      <p className="eyebrow"><span className="eyebrow-dot" /> STATUS PESANAN</p>
      {loading && !order ? (
        <p className="loyalty-loading" role="status">Memuat status pesanan…</p>
      ) : error && !order ? (
        <div className="form-alert form-alert-error" role="alert">
          <p>{error}</p>
          {error.includes("Masuk") && <Link href="/kartu">Masuk / buat Fuel Card</Link>}
        </div>
      ) : order ? (
        <>
          <div className="order-status-heading">
            <div>
              <h1>{order.code}</h1>
              <p>{order.statusLabel}</p>
            </div>
            <button className="quiet-button" type="button" onClick={() => { setLoading(true); setError(""); void loadOrder(); }} disabled={loading}>
              Perbarui status
            </button>
          </div>
          {notice && <p className="form-alert form-alert-success" role="status">{notice}</p>}
          {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
          {!["CANCELLED", "AWAITING_QUOTE", "AWAITING_PAYMENT", "PAYMENT_REVIEW"].includes(order.status) && (
            <ol className="order-stepper">
              {steps.map(([status, label]) => {
                const current = steps.findIndex(([value]) => value === order.status);
                const index = steps.findIndex(([value]) => value === status);
                return (
                  <li className={index <= current ? "order-step order-step-active" : "order-step"} key={status}>
                    <span>{index + 1}</span>{label}
                  </li>
                );
              })}
            </ol>
          )}
          <div className="order-status-grid">
            <div className="checkout-summary">
              <h2>Ringkasan pesanan</h2>
              {order.items.map((item) => (
                <div className="checkout-summary-item" key={item.name}>
                  <span>{item.name} × {item.quantity}{item.isReward ? " · reward gratis" : ""}</span>
                  <strong>Rp{currency.format(item.unitPrice * item.quantity)}</strong>
                </div>
              ))}
              <div className="checkout-summary-item">
                <span>Subtotal produk</span><strong>Rp{currency.format(order.subtotal)}</strong>
              </div>
              {order.discount > 0 && (
                <div className="checkout-summary-item">
                  <span>Potongan reward</span><strong>−Rp{currency.format(order.discount)}</strong>
                </div>
              )}
              <div className="checkout-summary-item">
                <span>Ongkir</span>
                <strong>{order.deliveryFee === null ? "Menunggu konfirmasi" : `Rp${currency.format(order.deliveryFee)}`}</strong>
              </div>
              {order.total !== null && (
                <div className="cart-summary">
                  <span>Total pembayaran</span><strong>Rp{currency.format(order.total)}</strong>
                </div>
              )}
              <p>{order.fulfillment === "PICKUP" ? "Ambil sendiri" : `Diantar · ${order.deliveryAddress ?? ""}`}</p>
            </div>
            {order.status === "AWAITING_QUOTE" && (
              <div className="order-payment-panel">
                <h2>Menunggu konfirmasi ongkir</h2>
                <p>Admin akan memeriksa area layanan dan menetapkan ongkir sebelum pembayaran.</p>
              </div>
            )}
            {order.status === "AWAITING_PAYMENT" && (
              <div className="order-payment-panel">
                <h2>Pembayaran QRIS</h2>
                {order.qrisImageUrl ? (
                  <>
                    <p>Bayar tepat sebesar <strong>Rp{currency.format(order.total ?? order.subtotal)}</strong>. Admin akan memeriksa bukti secara manual.</p>
                    <Image
                      className="order-qris-image"
                      src={order.qrisImageUrl}
                      alt="QRIS pembayaran Cartive"
                      width={420}
                      height={420}
                      unoptimized
                    />
                    {!order.paymentProofUploaded && (
                      <form className="order-proof-form" onSubmit={submitProof}>
                        <label className="manual-order-field">
                          Unggah bukti pembayaran
                          <input name="proof" type="file" accept="image/jpeg,image/png,image/webp,image/heic" required />
                          <span className="field-hint">JPG, PNG, WEBP, atau HEIC · maksimal 4 MB</span>
                        </label>
                        <button className="button button-primary" type="submit" disabled={busy}>
                          {busy ? "Mengirim…" : "Kirim bukti pembayaran"}
                        </button>
                      </form>
                    )}
                  </>
                ) : (
                  order.localSimulation ? (
                    <>
                      <p className="form-alert" role="note">
                        Mode simulasi lokal: jangan melakukan pembayaran. Unggah gambar contoh untuk menguji antrean pemeriksaan admin; ini bukan bukti transaksi nyata.
                      </p>
                      {!order.paymentProofUploaded && (
                        <form className="order-proof-form" onSubmit={submitProof}>
                          <label className="manual-order-field">
                            Gambar contoh untuk pengujian
                            <input name="proof" type="file" accept="image/jpeg,image/png,image/webp,image/heic" required />
                            <span className="field-hint">JPG, PNG, WEBP, atau HEIC · maksimal 4 MB</span>
                          </label>
                          <button className="button button-primary" type="submit" disabled={busy}>
                            {busy ? "Mengirim…" : "Kirim gambar contoh"}
                          </button>
                        </form>
                      )}
                    </>
                  ) : (
                    <p className="form-alert" role="status">
                      QRIS Cartive belum dikonfigurasi. Pesanan tersimpan, tetapi pembayaran belum dapat dilakukan.
                    </p>
                  )
                )}
              </div>
            )}
            {order.status === "PAYMENT_REVIEW" && (
              <div className="order-payment-panel">
                <h2>Bukti sedang diperiksa</h2>
                <p>Stamp belum diberikan. Admin akan mengonfirmasi pembayaran terlebih dahulu.</p>
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
