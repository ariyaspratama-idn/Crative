"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { StoreCatalogProduct } from "@/components/use-catalog";

type ProductSettings = Pick<StoreCatalogProduct, "id" | "price" | "isActive" | "imageUrl">;
type NewProductInput = {
  name: string;
  line: string;
  description: string;
  note: string;
  tone: string;
  price: string;
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

const emptyNewProduct: NewProductInput = {
  name: "",
  line: "",
  description: "",
  note: "",
  tone: "espresso",
  price: "10000",
};

export default function AdminProductsPanel() {
  const [products, setProducts] = useState<StoreCatalogProduct[]>([]);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [imageFiles, setImageFiles] = useState<Record<string, File | undefined>>({});
  const [newProduct, setNewProduct] = useState<NewProductInput>(emptyNewProduct);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const currency = new Intl.NumberFormat("id-ID");
  const settings = new Map(products.map((product) => [product.id, product]));

  const loadProducts = useCallback(async () => {
    const catalog = await readResponse<StoreCatalogProduct[]>(
      await fetch("/api/v1/products", { cache: "no-store" }),
    );
    setProducts(catalog);
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

  async function saveProduct(product: StoreCatalogProduct) {
    const rawPrice = priceInputs[product.id] ?? String(product.price);
    if (!/^\d+$/.test(rawPrice) || Number(rawPrice) > 1_000_000) {
      setError("Harga harus bilangan bulat antara Rp0 dan Rp1.000.000.");
      return;
    }

    setBusyId(product.id);
    setError("");
    setNotice("");
    try {
      await readResponse<ProductSettings>(
        await fetch(`/api/v1/admin/products/${encodeURIComponent(product.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ price: Number(rawPrice) }),
        }),
      );
      await loadProducts();
      setNotice(`${product.name} berhasil diperbarui dan dicatat di audit.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Harga belum dapat disimpan.");
    } finally {
      setBusyId("");
    }
  }

  async function toggleAvailability(product: StoreCatalogProduct) {
    setBusyId(product.id);
    setError("");
    setNotice("");
    try {
      await readResponse<ProductSettings>(
        await fetch(`/api/v1/admin/products/${encodeURIComponent(product.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !product.isActive }),
        }),
      );
      await loadProducts();
      setNotice(`${product.name} kini ${product.isActive ? "disembunyikan dari pemesanan" : "tersedia untuk dipesan"}; perubahan dicatat di audit.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Ketersediaan produk belum dapat diperbarui.");
    } finally {
      setBusyId("");
    }
  }

  async function uploadImage(product: StoreCatalogProduct) {
    const file = imageFiles[product.id];
    if (!file) {
      setError("Pilih foto produk terlebih dahulu.");
      return;
    }
    setBusyId(product.id);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.set("image", file);
      const result = await readResponse<{ imageUrl: string }>(
        await fetch(`/api/v1/admin/products/${encodeURIComponent(product.id)}/image`, {
          method: "POST",
          body,
        }),
      );
      setProducts((current) => current.map((item) =>
        item.id === product.id ? { ...item, imageUrl: result.imageUrl } : item,
      ));
      setImageFiles((current) => ({ ...current, [product.id]: undefined }));
      setNotice(`Foto ${product.name} berhasil disimpan. Tampilan botol bergerak tetap digunakan.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Foto produk belum dapat disimpan.");
    } finally {
      setBusyId("");
    }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(newProduct.price);
    if (!Number.isInteger(price) || price < 0 || price > 1_000_000) {
      setError("Harga harus bilangan bulat antara Rp0 dan Rp1.000.000.");
      return;
    }
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const created = await readResponse<StoreCatalogProduct>(
        await fetch("/api/v1/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...newProduct, price }),
        }),
      );
      setNewProduct(emptyNewProduct);
      await loadProducts();
      setNotice(`${created.name} ditambahkan ke katalog. Tambahkan foto atau stok batch agar bisa dipesan.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Varian baru belum dapat dibuat.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="admin-products-panel" id="produk">
      <div className="admin-data-requests-heading">
        <div>
          <p className="admin-eyebrow">KATALOG · PRODUK, FOTO & KETERSEDIAAN</p>
          <h2>Kelola produk</h2>
          <p className="admin-description">
            Tambahkan varian dengan nama lini sendiri, ubah harga, dan unggah foto produk.
            Foto disimpan di object storage yang sama dengan bukti secara terpisah; produk baru perlu stok batch untuk bisa dipesan.
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
      <form className="admin-create-product" onSubmit={(event) => void createProduct(event)}>
        <h3>Tambah varian menu</h3>
        <label className="admin-field">
          Nama produk
          <input required minLength={2} maxLength={80} value={newProduct.name}
            onChange={(event) => setNewProduct((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="admin-field">
          Nama lini / kategori
          <input required maxLength={30} placeholder="Contoh: Reka, Sela, atau lini baru"
            value={newProduct.line}
            onChange={(event) => setNewProduct((current) => ({ ...current, line: event.target.value }))} />
        </label>
        <label className="admin-field">
          Deskripsi
          <textarea required maxLength={300} rows={2} value={newProduct.description}
            onChange={(event) => setNewProduct((current) => ({ ...current, description: event.target.value }))} />
        </label>
        <label className="admin-field">
          Catatan varian
          <input required maxLength={100} placeholder="Contoh: Smooth · 250 ml"
            value={newProduct.note}
            onChange={(event) => setNewProduct((current) => ({ ...current, note: event.target.value }))} />
        </label>
        <label className="admin-field">
          Gaya ilustrasi botol
          <select value={newProduct.tone}
            onChange={(event) => setNewProduct((current) => ({ ...current, tone: event.target.value }))}>
            <option value="espresso">Espresso</option>
            <option value="dark">Gelap</option>
            <option value="black">Hitam</option>
            <option value="caramel">Karamel</option>
            <option value="cream">Krim</option>
            <option value="honey">Madu</option>
          </select>
        </label>
        <label className="admin-field">
          Harga per botol (Rp)
          <input type="number" min={0} max={1_000_000} step={1} required value={newProduct.price}
            onChange={(event) => setNewProduct((current) => ({ ...current, price: event.target.value }))} />
        </label>
        <button className="admin-button admin-button-approve" type="submit" disabled={creating || loading}>
          {creating ? "Menambahkan…" : "Tambah ke katalog"}
        </button>
      </form>
      {loading ? (
        <p className="admin-empty">Memuat katalog…</p>
      ) : (
        <div className="admin-product-list">
          {products.map((product) => {
            const current = settings.get(product.id);
            if (!current) return null;
            return (
              <article className="admin-product-row" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <small>{product.line} · {product.note}</small>
                  <small>{current.isActive ? "Aktif di katalog" : "Tidak ditawarkan"}</small>
                  <small>{current.imageUrl ? "Foto produk tersedia" : "Memakai ilustrasi botol"}</small>
                </div>
                <label className="admin-field">
                  Harga per botol (Rp)
                  <input type="number" min={0} max={1_000_000} step={1} inputMode="numeric"
                    value={priceInputs[product.id] ?? ""}
                    onChange={(event) => setPriceInputs((values) => ({ ...values, [product.id]: event.target.value }))}
                    aria-label={`Harga ${product.name}`} />
                </label>
                <div className="admin-product-actions">
                  <span>Harga saat ini: Rp{currency.format(current.price)}</span>
                  <label className="admin-field">
                    Foto produk (JPEG/PNG/WebP, maks. 4 MB)
                    <input type="file" accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => setImageFiles((values) => ({ ...values, [product.id]: event.target.files?.[0] }))}
                      aria-label={`Foto ${product.name}`} />
                  </label>
                  <button className="admin-button admin-button-refresh" type="button" disabled={busyId !== ""}
                    onClick={() => void uploadImage(product)}>
                    {busyId === product.id ? "Mengunggah…" : "Simpan foto"}
                  </button>
                  <button className="admin-button admin-button-refresh" type="button" disabled={busyId !== ""}
                    onClick={() => void saveProduct(product)}>
                    {busyId === product.id ? "Menyimpan…" : "Simpan harga"}
                  </button>
                  <button
                    className={current.isActive ? "admin-button admin-button-reject" : "admin-button admin-button-approve"}
                    type="button" disabled={busyId !== ""} onClick={() => void toggleAvailability(product)}>
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
