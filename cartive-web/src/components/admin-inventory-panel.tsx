"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useCatalog } from "@/components/use-catalog";

type Batch = {
  id: string;
  productId: string;
  productName: string;
  batchCode: string;
  quantityProduced: number;
  quantityAvailable: number;
  bestBeforeAt: string | null;
  isActive: boolean;
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

export default function AdminInventoryPanel() {
  const { products } = useCatalog();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [productId, setProductId] = useState<string>(products[0].id);
  const [batchCode, setBatchCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [stockInputs, setStockInputs] = useState<Record<string, string>>({});
  const [bestBeforeDate, setBestBeforeDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyBatchId, setBusyBatchId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchBatches = useCallback(async () => {
    return readResponse<Batch[]>(await fetch("/api/v1/admin/batches", { cache: "no-store" }));
  }, []);

  const showBatches = useCallback((loaded: Batch[]) => {
    setBatches(loaded);
    setStockInputs(Object.fromEntries(loaded.map((batch) => [batch.id, String(batch.quantityAvailable)])));
  }, []);

  const loadBatches = useCallback(async () => {
    try {
      showBatches(await fetchBatches());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Stok batch belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [fetchBatches, showBatches]);

  useEffect(() => {
    let active = true;
    fetchBatches()
      .then((loaded) => { if (active) showBatches(loaded); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Stok batch belum dapat dimuat.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchBatches, showBatches]);

  async function createBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await readResponse(await fetch("/api/v1/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          batchCode,
          quantity: Number(quantity),
          ...(bestBeforeDate ? { bestBeforeDate } : {}),
        }),
      }));
      setBatchCode("");
      setQuantity("1");
      setBestBeforeDate("");
      setNotice("Batch stok berhasil ditambahkan dan dicatat di audit.");
      await loadBatches();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Batch belum dapat ditambahkan.");
    } finally {
      setBusy(false);
    }
  }

  async function updateBatch(batch: Batch, updates: { quantityAvailable?: number; isActive?: boolean }) {
    setBusyBatchId(batch.id);
    setError("");
    setNotice("");
    try {
      await readResponse(await fetch(`/api/v1/admin/batches/${encodeURIComponent(batch.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }));
      setNotice(`Batch ${batch.batchCode} berhasil diperbarui dan dicatat di audit.`);
      await loadBatches();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Batch belum dapat diperbarui.");
    } finally {
      setBusyBatchId("");
    }
  }

  return (
    <section className="admin-inventory-panel" id="inventaris">
      <div className="admin-data-requests-heading">
        <div>
          <p className="admin-eyebrow">STOK PER BATCH</p>
          <h2>Inventaris produk</h2>
          <p className="admin-description">Pesanan hanya dapat dibuat bila stok batch aktif mencukupi. Batch baru tidak mengubah harga katalog.</p>
        </div>
        <button className="admin-button admin-button-refresh" type="button" onClick={() => { setLoading(true); setError(""); void loadBatches(); }} disabled={loading}>
          Muat ulang
        </button>
      </div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      <form className="admin-batch-form" onSubmit={createBatch}>
        <label className="admin-field">
          Produk
          <select value={productId} onChange={(event) => setProductId(event.target.value)}>
            {products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}
          </select>
        </label>
        <label className="admin-field">
          Kode batch
          <input value={batchCode} onChange={(event) => setBatchCode(event.target.value)} maxLength={80} required />
        </label>
        <label className="admin-field">
          Jumlah botol
          <input type="number" min={1} max={100000} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
        </label>
        <label className="admin-field">
          Baik dikonsumsi sebelum (opsional)
          <input type="date" value={bestBeforeDate} onChange={(event) => setBestBeforeDate(event.target.value)} />
        </label>
        <button className="admin-button admin-button-approve" type="submit" disabled={busy}>
          {busy ? "Menyimpan…" : "Tambah batch"}
        </button>
      </form>
      {loading ? (
        <p className="admin-empty">Memuat batch…</p>
      ) : batches.length === 0 ? (
        <p className="admin-empty">Belum ada batch; pesanan online belum bisa dibuat sampai stok dicatat.</p>
      ) : (
        <div className="admin-batch-list">
          {batches.map((batch) => (
            <article className="admin-batch-row" key={batch.id}>
              <div><strong>{batch.productName}</strong><small>Batch {batch.batchCode}</small></div>
              <span>{batch.quantityAvailable} / {batch.quantityProduced} botol tersedia</span>
              <small>{batch.bestBeforeAt ? `Baik dikonsumsi sebelum ${new Date(batch.bestBeforeAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}` : "Tanpa tanggal kedaluwarsa"}</small>
              <div className="admin-batch-actions">
                <label className="admin-field">
                  Sesuaikan stok tersedia
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    step={1}
                    value={stockInputs[batch.id] ?? String(batch.quantityAvailable)}
                    onChange={(event) => setStockInputs((current) => ({ ...current, [batch.id]: event.target.value }))}
                    aria-label={`Stok tersedia batch ${batch.batchCode}`}
                  />
                </label>
                <button
                  className="admin-button admin-button-refresh"
                  type="button"
                  disabled={busyBatchId !== ""}
                  onClick={() => {
                    const input = stockInputs[batch.id] ?? String(batch.quantityAvailable);
                    if (!/^\d+$/.test(input) || Number(input) > batch.quantityProduced) {
                      setError(`Stok tersedia harus bilangan bulat antara 0 dan ${batch.quantityProduced}.`);
                      return;
                    }
                    void updateBatch(batch, { quantityAvailable: Number(input) });
                  }}
                >
                  Simpan stok
                </button>
                <button
                  className="admin-button admin-button-refresh"
                  type="button"
                  disabled={busyBatchId !== ""}
                  onClick={() => void updateBatch(batch, { isActive: !batch.isActive })}
                >
                  {batch.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
