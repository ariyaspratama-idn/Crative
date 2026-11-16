"use client";

import { useCallback, useEffect, useState } from "react";
import { products, type CatalogProduct } from "@/lib/catalog";

type ProductSettings = { id: string; price: number; isActive: boolean };
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

export default function AdminProductsPanel() {
  const [settings, setSettings] = useState<Record<string, ProductSettings>>({});
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const currency = new Intl.NumberFormat("id-ID");

  const loadProducts = useCallback(async () => {
    const catalog = await readResponse<Array<ProductSettings & { quantityAvailable: number; isAvailable: boolean }>>(
      await fetch("/api/v1/products", { cache: "no-store" }),
    );
    const nextSettings = Object.fromEntries(
      catalog.map(({ id, price, isActive }) => [id, { id, price, isActive }]),
    );
    setSettings(nextSettings);
    setPriceInputs(Object.fromEntries(catalog.map(({ id, price }) => [id, String(price)])));
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(loadProducts)
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Katalog belum dapat dimuat.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadProducts]);

  async function saveProduct(product: CatalogProduct) {
    const current = settings[product.id];
    const rawPrice = priceInputs[product.id] ?? String(current?.price ?? product.price);
    if (!/^\d+$/.test(rawPrice) || Number(rawPrice) > 1_000_000) {
      setError("Harga harus bilangan bulat antara Rp0 dan Rp1.000.000.");
      return;
    }

    setBusyId(product.id);
    setError("");
    setNotice("");
    try {
      const updated = await readResponse<ProductSettings>(
        await fetch(`/api/v1/admin/products/${encodeURIComponent(product.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ price: Number(rawPrice) }),
        }),
      );
      setSettings((currentSettings) => ({ ...currentSettings, [product.id]: updated }));
      setNotice(`${product.name} berhasil diperbarui dan dicatat di audit.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Harga belum dapat disimpan.");
    } finally {
      setBusyId("");
    }
  }

  async function toggleAvailability(product: CatalogProduct) {
    const current = settings[product.id];
    if (!current) return;
    setBusyId(product.id);
    setError("");
    setNotice("");
    try {
      const updated = await readResponse<ProductSettings>(
        await fetch(`/api/v1/admin/products/${encodeURIComponent(product.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !current.isActive }),
        }),
      );
      setSettings((currentSettings) => ({ ...currentSettings, [product.id]: updated }));
      setNotice(`${product.name} kini ${updated.isActive ? "tersedia untuk dipesan" : "disembunyikan dari pemesanan"}; perubahan dicatat di audit.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Ketersediaan produk belum dapat diperbarui.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="admin-products-panel" id="produk">
      <div className="admin-data-requests-heading">
        <div>
          <p className="admin-eyebrow">KATALOG · HARGA & KETERSEDIAAN</p>
          <h2>Kelola produk</h2>
          <p className="admin-description">
            Perubahan harga berlaku untuk pesanan baru. Pesanan yang sudah dibuat tetap memakai harga saat checkout.
            Ketersediaan produk terpisah dari stok batch.
          </p>
        </div>
        <button
          className="admin-button admin-button-refresh"
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setError("");
            void loadProducts()
              .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Katalog belum dapat dimuat."))
              .finally(() => setLoading(false));
          }}
        >
          Muat ulang
        </button>
      </div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      {loading ? (
        <p className="admin-empty">Memuat katalog…</p>
      ) : (
        <div className="admin-product-list">
          {products.map((product) => {
            const current = settings[product.id];
            if (!current) return null;
            return (
              <article className="admin-product-row" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <small>{product.line} · {product.note}</small>
                  <small>{current.isActive ? "Aktif di katalog" : "Tidak ditawarkan"}</small>
                </div>
                <label className="admin-field">
                  Harga per botol (Rp)
                  <input
                    type="number"
                    min={0}
                    max={1_000_000}
                    step={1}
                    inputMode="numeric"
                    value={priceInputs[product.id] ?? ""}
                    onChange={(event) => setPriceInputs((values) => ({ ...values, [product.id]: event.target.value }))}
                    aria-label={`Harga ${product.name}`}
                  />
                </label>
                <div className="admin-product-actions">
                  <span>Harga saat ini: Rp{currency.format(current.price)}</span>
                  <button
                    className="admin-button admin-button-refresh"
                    type="button"
                    disabled={busyId !== ""}
                    onClick={() => void saveProduct(product)}
                  >
                    {busyId === product.id ? "Menyimpan…" : "Simpan harga"}
                  </button>
                  <button
                    className={current.isActive ? "admin-button admin-button-reject" : "admin-button admin-button-approve"}
                    type="button"
                    disabled={busyId !== ""}
                    onClick={() => void toggleAvailability(product)}
                  >
                    {busyId === product.id ? "Memperbarui…" : current.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
