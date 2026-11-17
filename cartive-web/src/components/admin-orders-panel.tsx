"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Order = {
  id: string;
  code: string;
  status: string;
  fulfillment: "PICKUP" | "DELIVERY";
  memberWa: string;
  deliveryAddress: string | null;
  note: string | null;
  subtotal: number;
  discount: number;
  deliveryFee: number | null;
  total: number | null;
  paymentProofAvailable: boolean;
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

const statusLabels: Record<string, string> = {
  AWAITING_QUOTE: "Menunggu konfirmasi ongkir",
  AWAITING_PAYMENT: "Menunggu pembayaran",
  PAYMENT_REVIEW: "Bukti pembayaran perlu diperiksa",
  PAID: "Dibayar",
  PROCESSING: "Diproses",
  READY: "Siap",
};

export default function AdminOrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [fees, setFees] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchOrders = useCallback(async () => {
    return readResponse<Order[]>(await fetch("/api/v1/admin/orders", { cache: "no-store" }));
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await fetchOrders());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Pesanan belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [fetchOrders]);

  useEffect(() => {
    let active = true;
    fetchOrders()
      .then((loaded) => { if (active) setOrders(loaded); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Pesanan belum dapat dimuat.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchOrders]);

  async function act(order: Order, body: Record<string, unknown>, success: string) {
    setBusyId(order.id);
    setError("");
    setNotice("");
    try {
      await readResponse(await fetch(
        `/api/v1/admin/orders/${encodeURIComponent(order.id)}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      ));
      setNotice(success);
      await loadOrders();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Perubahan pesanan belum tersimpan.");
    } finally {
      setBusyId("");
    }
  }

  function quote(event: FormEvent<HTMLFormElement>, order: Order) {
    event.preventDefault();
    const fee = Number(fees[order.id]);
    if (!Number.isInteger(fee) || fee < 0 || fee > 500000) {
      setError("Ongkir harus berupa angka antara Rp0 dan Rp500.000.");
      return;
    }
    void act(order, { action: "QUOTE", deliveryFee: fee }, "Ongkir disimpan dan total pesanan diperbarui.");
  }

  const currency = new Intl.NumberFormat("id-ID");
  return (
    <section className="admin-orders-panel" id="pesanan">
      <div className="admin-data-requests-heading">
        <div>
          <p className="admin-eyebrow">TOKO LANGSUNG</p>
          <h2>Pesanan web</h2>
          <p className="admin-description">Konfirmasi ongkir dan bukti pembayaran sebelum memproses pesanan.</p>
        </div>
        <div className="admin-orders-actions">
          <a className="admin-button admin-button-refresh" href="/api/v1/admin/export/orders.csv" download>
            Ekspor CSV
          </a>
          <button className="admin-button admin-button-refresh" type="button" onClick={() => { setLoading(true); setError(""); void loadOrders(); }} disabled={loading}>
            Muat ulang
          </button>
        </div>
      </div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      {loading ? (
        <p className="admin-empty">Memuat pesanan…</p>
      ) : orders.length === 0 ? (
        <p className="admin-empty">Belum ada pesanan web yang perlu ditindaklanjuti.</p>
      ) : (
        <div className="admin-claim-list">
          {orders.map((order) => (
            <article className="admin-claim-card admin-order-card" key={order.id}>
              <div className="admin-claim-details">
                <div className="admin-claim-heading">
                    <div><p className="admin-eyebrow">{order.code}</p><h2>{order.memberWa}</h2></div>
                  <span className="admin-claim-count">{statusLabels[order.status] ?? order.status}</span>
                </div>
                <p className="admin-claim-meta">
                    {order.fulfillment === "PICKUP" ? "Ambil sendiri" : "Diantar"}
                </p>
                {order.deliveryAddress && <p className="admin-data-request-details">{order.deliveryAddress}</p>}
                <ul className="admin-order-items">
                  {order.items.map((item) => (
                    <li key={item.name}>{item.name} × {item.quantity}{item.isReward ? " · reward gratis" : ` · Rp${currency.format(item.unitPrice * item.quantity)}`}</li>
                  ))}
                </ul>
                <p className="admin-claim-meta">
                  Subtotal Rp{currency.format(order.subtotal)}
                  {order.discount > 0 && ` · Reward −Rp${currency.format(order.discount)}`}
                  {order.total !== null && ` · Total Rp${currency.format(order.total)}`}
                  {order.note && ` · Catatan: ${order.note}`}
                </p>
                {order.paymentProofAvailable && (
                  <a
                    className="admin-receipt"
                    href={`/api/v1/admin/orders/${encodeURIComponent(order.id)}/payment-proof`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      src={`/api/v1/admin/orders/${encodeURIComponent(order.id)}/payment-proof`}
                      alt={`Bukti pembayaran ${order.code}`}
                      width={800}
                      height={600}
                      unoptimized
                    />
                    <span>Buka bukti pembayaran</span>
                  </a>
                )}
                {order.status === "AWAITING_QUOTE" && (
                  <form className="admin-order-quote" onSubmit={(event) => quote(event, order)}>
                    <label className="admin-field">
                      Ongkir (Rp)
                      <input
                        type="number"
                        min={0}
                        max={500000}
                        step={1000}
                        value={fees[order.id] ?? ""}
                        onChange={(event) => setFees((current) => ({ ...current, [order.id]: event.target.value }))}
                        required
                      />
                    </label>
                    <button className="admin-button admin-button-approve" disabled={busyId === order.id}>
                      Tetapkan ongkir
                    </button>
                  </form>
                )}
                <div className="admin-claim-actions">
                  {order.status === "PAYMENT_REVIEW" && (
                    <button
                      className="admin-button admin-button-approve"
                      type="button"
                      disabled={busyId === order.id}
                      onClick={() => void act(order, { action: "CONFIRM_PAYMENT" }, "Pembayaran dikonfirmasi dan stamp web diberikan.")}
                    >
                      Konfirmasi pembayaran
                    </button>
                  )}
                  {order.status === "PAID" && (
                    <button className="admin-button admin-button-approve" type="button" disabled={busyId === order.id} onClick={() => void act(order, { action: "ADVANCE", status: "PROCESSING" }, "Pesanan diproses.")}>
                      Mulai proses
                    </button>
                  )}
                  {order.status === "PROCESSING" && (
                    <button className="admin-button admin-button-approve" type="button" disabled={busyId === order.id} onClick={() => void act(order, { action: "ADVANCE", status: "READY" }, "Pesanan ditandai siap.")}>
                      Tandai siap
                    </button>
                  )}
                  {order.status === "READY" && (
                    <button className="admin-button admin-button-approve" type="button" disabled={busyId === order.id} onClick={() => void act(order, { action: "ADVANCE", status: "COMPLETED" }, "Pesanan ditandai selesai.")}>
                      Tandai selesai
                    </button>
                  )}
                  {["AWAITING_QUOTE", "AWAITING_PAYMENT"].includes(order.status) && (
                    <button className="admin-button admin-button-reject" type="button" disabled={busyId === order.id} onClick={() => void act(order, { action: "CANCEL" }, "Pesanan dibatalkan.")}>
                      Batalkan pesanan
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
