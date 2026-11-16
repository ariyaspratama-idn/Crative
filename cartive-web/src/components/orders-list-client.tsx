"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Order = {
  code: string;
  status: string;
  statusLabel: string;
  fulfillment: "PICKUP" | "DELIVERY";
  subtotal: number;
  deliveryFee: number | null;
  total: number | null;
  createdAt: string;
};

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

export default function OrdersListClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async () => {
    const response = await fetch("/api/v1/orders", { cache: "no-store" });
    const body = await response.json() as ApiResponse<Order[]>;
    if (!response.ok || body.error || body.data === null) {
      throw new Error(body.error?.message ?? "Daftar pesanan belum dapat dimuat.");
    }
    return body.data;
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await fetchOrders());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Daftar pesanan belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [fetchOrders]);

  useEffect(() => {
    let active = true;
    fetchOrders()
      .then((loaded) => { if (active) setOrders(loaded); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Daftar pesanan belum dapat dimuat.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchOrders]);

  const currency = new Intl.NumberFormat("id-ID");
  return (
    <section className="orders-page section-wrap">
      <p className="eyebrow"><span className="eyebrow-dot" /> PESANAN SAYA</p>
      <div className="order-status-heading">
        <div>
          <h1>Pesanan kamu</h1>
          <p>Riwayat pesanan web yang terhubung ke Fuel Card.</p>
        </div>
        <button className="quiet-button" type="button" onClick={() => { setLoading(true); setError(""); void loadOrders(); }} disabled={loading}>
          Perbarui
        </button>
      </div>

      {loading && orders.length === 0 && (
        <p className="loyalty-loading" role="status">Memuat pesanan…</p>
      )}
      {error && (
        <div className="form-alert form-alert-error" role="alert">
          <p>{error}</p>
          {error.toLowerCase().includes("masuk") && <Link href="/kartu">Masuk / buat Fuel Card</Link>}
        </div>
      )}
      {!loading && !error && orders.length === 0 && (
        <div className="orders-empty">
          <h2>Belum ada pesanan web</h2>
          <p>Pesanan web yang kamu buat akan muncul di sini.</p>
          <Link className="button button-primary" href="/menu">Lihat menu</Link>
        </div>
      )}
      {orders.length > 0 && (
        <div className="orders-list">
          {orders.map((order) => (
            <Link className="order-list-card" href={`/pesanan/${encodeURIComponent(order.code)}`} key={order.code}>
              <span className="order-list-topline">
                <strong>{order.code}</strong>
                <span>{order.statusLabel}</span>
              </span>
              <span className="order-list-bottomline">
                <span>
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Jakarta",
                  }).format(new Date(order.createdAt))}
                  {" · "}
                  {order.fulfillment === "PICKUP" ? "Ambil sendiri" : "Diantar"}
                </span>
                <strong>
                  {order.total === null
                    ? `Subtotal Rp${currency.format(order.subtotal)} · ongkir menunggu`
                    : `Rp${currency.format(order.total)}`}
                </strong>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
