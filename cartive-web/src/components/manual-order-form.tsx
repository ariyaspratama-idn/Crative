"use client";

import { FormEvent, useState } from "react";
import { useCatalog } from "@/components/use-catalog";

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

async function readResponse<T>(response: Response) {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || body.error || body.data === null) {
    throw new Error(body.error?.message ?? "Permintaan belum dapat diproses.");
  }
  return body.data;
}

export default function ManualOrderForm({ initialProductId }: { initialProductId?: string }) {
  const { products, loading: catalogLoading, error: catalogError } = useCatalog();
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    initialProductId ? { [initialProductId]: 1 } : {},
  );
  const [fulfillment, setFulfillment] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [localMessage, setLocalMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const subtotal = products.reduce(
    (total, product) => total + product.price * (quantities[product.id] ?? 0),
    0,
  );
  const currency = new Intl.NumberFormat("id-ID");

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const items = products
      .filter((product) => (quantities[product.id] ?? 0) > 0)
      .map((product) => ({
        productId: product.id,
        quantity: quantities[product.id],
      }));

    if (items.length === 0) {
      setError("Pilih setidaknya satu produk.");
      return;
    }

    setBusy(true);
    setError("");
    setWhatsappUrl("");
    setLocalMessage("");
    setCopied(false);
    try {
      const response = await fetch("/api/v1/orders/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.get("customerName"),
          fulfillment,
          address: form.get("address") || undefined,
          note: form.get("note") || undefined,
          items,
        }),
      });
      const result = await readResponse<{
        whatsappUrl: string | null;
        message: string;
        localSimulation: boolean;
      }>(response);
      if (result.localSimulation) {
        setLocalMessage(result.message);
      } else if (result.whatsappUrl) {
        setWhatsappUrl(result.whatsappUrl);
      } else {
        throw new Error("Tautan WhatsApp belum dapat disiapkan.");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Pesanan belum dapat disiapkan.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyLocalMessage() {
    try {
      await navigator.clipboard.writeText(localMessage);
      setCopied(true);
      setError("");
    } catch {
      setError("Pesan belum dapat disalin. Pilih dan salin teks pada kotak pesan.");
    }
  }

  return (
    <form className="manual-order-form" onSubmit={submitOrder}>
      <div className="manual-order-products">
        {products.filter((product) => product.isActive).map((product) => (
          <label className="manual-order-product" key={product.id}>
            <span>
              <strong>{product.name}</strong>
              <small>{product.note} · Rp{currency.format(product.price)}</small>
            </span>
            <span className="manual-order-quantity">
              <span className="sr-only">Jumlah {product.name}</span>
              <select
                aria-label={`Jumlah ${product.name}`}
                value={quantities[product.id] ?? 0}
                onChange={(event) => {
                  setWhatsappUrl("");
                  setQuantities((current) => ({
                    ...current,
                    [product.id]: Number(event.target.value),
                  }));
                }}
              >
                {Array.from({ length: 11 }, (_, count) => (
                  <option value={count} key={count}>{count}</option>
                ))}
              </select>
            </span>
          </label>
        ))}
      </div>

      <label className="manual-order-field">
        Nama pemesan
        <input
          name="customerName"
          autoComplete="name"
          maxLength={100}
          onChange={() => setWhatsappUrl("")}
          required
        />
      </label>
      <label className="manual-order-field">
        Metode penerimaan
        <select
          value={fulfillment}
          onChange={(event) => {
            setWhatsappUrl("");
            setFulfillment(event.target.value as "DELIVERY" | "PICKUP");
          }}
        >
          <option value="DELIVERY">Diantar</option>
          <option value="PICKUP">Ambil di tempat</option>
        </select>
      </label>
      {fulfillment === "DELIVERY" && (
        <label className="manual-order-field">
          Alamat pengiriman
          <textarea
            name="address"
            autoComplete="street-address"
            maxLength={400}
            onChange={() => setWhatsappUrl("")}
            required
            rows={3}
          />
        </label>
      )}
      <label className="manual-order-field">
        Catatan pesanan <span>(opsional)</span>
        <textarea name="note" maxLength={250} onChange={() => setWhatsappUrl("")} rows={2} />
      </label>

      <div className="manual-order-subtotal">
        <span>Subtotal produk</span>
        <strong>Rp{currency.format(subtotal)}</strong>
      </div>
      <p className="manual-order-disclaimer">
        Ini permintaan pesanan manual, bukan checkout atau konfirmasi stok. Admin akan memastikan
        ketersediaan dan ongkir lewat WhatsApp. Setelah mendapat konfirmasi, kirim bukti pembayaran
        sebagai lampiran di chat.
      </p>
      {catalogError && (
        <p className="manual-order-disclaimer" role="status">
          Katalog belum dapat diperbarui. Harga yang ditampilkan adalah harga acuan; server akan memeriksa harga dan ketersediaan saat permintaan dikirim.
        </p>
      )}
      {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
      {localMessage && (
        <div className="manual-order-local-simulation">
          <p className="form-alert" role="note">Mode simulasi lokal: pesanan ini belum dikirim dan tidak tercatat sebagai order.</p>
          <label className="manual-order-field">
            Draf pesan
            <textarea readOnly value={localMessage} rows={8} />
          </label>
          <button className="button button-primary submit-button" type="button" onClick={copyLocalMessage}>
            {copied ? "Pesan tersalin" : "Salin draf pesan"}
          </button>
        </div>
      )}
      {whatsappUrl ? (
        <a className="button button-primary submit-button" href={whatsappUrl} target="_blank" rel="noreferrer">
          Lanjutkan ke WhatsApp <span aria-hidden="true">↗</span>
        </a>
      ) : (
        <button className="button button-primary submit-button" type="submit" disabled={busy || catalogLoading || subtotal === 0}>
          {busy ? "Menyiapkan pesanan…" : "Siapkan pesan pesanan"} <span aria-hidden="true">↗</span>
        </button>
      )}
    </form>
  );
}
