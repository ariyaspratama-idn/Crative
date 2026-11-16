"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type DataRequestType = "ACCESS" | "RECTIFICATION" | "ERASURE";
type DataRequest = {
  id: string;
  type: DataRequestType;
  status: "PENDING" | "IN_REVIEW" | "COMPLETED" | "DECLINED";
  details: string | null;
  resolution: string | null;
  createdAt: string;
  reviewedAt: string | null;
};
type Profile = {
  waNumber: string;
  waVerified: boolean;
  consentPrivacyAt: string;
  consentPromo: boolean;
  createdAt: string;
  dataRequests: DataRequest[];
};
type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

const requestLabels: Record<DataRequestType, string> = {
  ACCESS: "Akses salinan data",
  RECTIFICATION: "Perbaikan data",
  ERASURE: "Permintaan penghapusan data",
};
const requestStatusLabels: Record<DataRequest["status"], string> = {
  PENDING: "Menunggu ditinjau",
  IN_REVIEW: "Sedang ditinjau",
  COMPLETED: "Selesai ditangani",
  DECLINED: "Tidak dapat dipenuhi",
};

async function readResponse<T>(response: Response) {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || body.error || body.data === null) {
    throw new Error(body.error?.message ?? "Permintaan belum dapat diproses.");
  }
  return body.data;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
}

export default function ProfileSettingsClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [requestType, setRequestType] = useState<DataRequestType>("ACCESS");
  const [details, setDetails] = useState("");
  const [confirmErasure, setConfirmErasure] = useState(false);

  const loadProfile = useCallback(async () => {
    setError("");
    try {
      const currentProfile = await readResponse<Profile>(
        await fetch("/api/v1/profile", { cache: "no-store" }),
      );
      setProfile(currentProfile);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Profil belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadProfile);
  }, [loadProfile]);

  async function updatePromotionConsent(consentPromo: boolean) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await readResponse(
        await fetch("/api/v1/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consentPromo }),
        }),
      );
      setProfile((current) => current ? { ...current, consentPromo } : current);
      setNotice(
        consentPromo
          ? "Persetujuan promosi WhatsApp diaktifkan."
          : "Persetujuan promosi WhatsApp ditarik.",
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Pengaturan belum dapat diubah.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDataRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await readResponse<DataRequest>(
        await fetch("/api/v1/profile/data-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: requestType,
            details: details.trim() || undefined,
            ...(requestType === "ERASURE" ? { confirmErasure } : {}),
          }),
        }),
      );
      setDetails("");
      setConfirmErasure(false);
      setNotice(`${requestLabels[result.type]} berhasil dikirim untuk ditinjau admin.`);
      await loadProfile();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Permintaan data belum dapat dikirim.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Cartive, ke beranda">
          <span className="wordmark-mark">c.</span>
          <span>cartive</span>
        </Link>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          <Link href="/kartu">Fuel Card</Link>
          <Link href="/privasi">Privasi</Link>
        </nav>
      </header>
      <section className="profile-page section-wrap">
        <Link className="back-link" href="/kartu">← Kembali ke Fuel Card</Link>
        <p className="eyebrow"><span className="eyebrow-dot" /> PROFIL PELANGGAN</p>
        <h1>Data dan <em>persetujuan.</em></h1>
        <p className="profile-lead">
          Periksa data Fuel Card, atur persetujuan promosi, atau ajukan permintaan terkait data.
        </p>

        {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
        {notice && <p className="form-alert form-alert-success" role="status">{notice}</p>}
        {loading ? (
          <p className="profile-notice" role="status">Memuat profil…</p>
        ) : profile ? (
          <div className="profile-grid">
            <section className="profile-panel">
              <p className="eyebrow">AKUN FUEL CARD</p>
              <h2>Informasi akun</h2>
              <dl className="profile-data-list">
                <div><dt>Nomor WhatsApp</dt><dd>{profile.waNumber}</dd></div>
                <div><dt>Status nomor</dt><dd>{profile.waVerified ? "Terverifikasi" : "Belum terverifikasi"}</dd></div>
                <div><dt>Akun dibuat</dt><dd>{formatDate(profile.createdAt)}</dd></div>
              </dl>
              <Link className="product-link" href="/kartu">Buka Fuel Card ↗</Link>
            </section>

            <section className="profile-panel">
              <p className="eyebrow">PILIHAN PRIVASI</p>
              <h2>Pesan promosi</h2>
              <p>
                Persetujuan ini opsional. Menariknya tidak memengaruhi stamp atau layanan Fuel Card.
              </p>
              <label className="profile-consent">
                <input
                  type="checkbox"
                  checked={profile.consentPromo}
                  disabled={busy}
                  onChange={(event) => void updatePromotionConsent(event.target.checked)}
                />
                <span>Saya bersedia menerima promosi Cartive melalui WhatsApp.</span>
              </label>
              <p className="profile-footnote">
                Persetujuan privasi layanan dicatat saat akun dibuat pada {formatDate(profile.consentPrivacyAt)}.
              </p>
            </section>

            <section className="profile-panel profile-request-panel">
              <p className="eyebrow">HAK DATA</p>
              <h2>Ajukan permintaan data</h2>
              <p>
                Permintaan masuk ke antrean admin untuk diverifikasi melalui akun Fuel Card ini.
                Permintaan penghapusan tidak langsung menghapus data; admin akan meninjau kewajiban
                operasional dan retensi terlebih dahulu.
              </p>
              <form className="profile-request-form" onSubmit={submitDataRequest}>
                <label className="manual-order-field">
                  Jenis permintaan
                  <select
                    value={requestType}
                    onChange={(event) => {
                      setRequestType(event.target.value as DataRequestType);
                      setConfirmErasure(false);
                    }}
                  >
                    {Object.entries(requestLabels).map(([value, label]) => (
                      <option value={value} key={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="manual-order-field">
                  Keterangan <span>(opsional)</span>
                  <textarea
                    maxLength={500}
                    rows={3}
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    placeholder={requestType === "RECTIFICATION" ? "Jelaskan data yang perlu diperbaiki." : "Tambahkan konteks bila diperlukan."}
                  />
                </label>
                {requestType === "ERASURE" && (
                  <label className="profile-consent profile-erasure-confirm">
                    <input
                      type="checkbox"
                      checked={confirmErasure}
                      onChange={(event) => setConfirmErasure(event.target.checked)}
                      required
                    />
                    <span>Saya memahami ini adalah permintaan penghapusan, bukan penghapusan otomatis saat ini.</span>
                  </label>
                )}
                <button className="button button-primary submit-button" type="submit" disabled={busy || (requestType === "ERASURE" && !confirmErasure)}>
                  {busy ? "Mengirim…" : "Kirim permintaan"}
                </button>
              </form>
            </section>

            <section className="profile-panel profile-history-panel">
              <p className="eyebrow">RIWAYAT</p>
              <h2>Permintaan data</h2>
              {profile.dataRequests.length === 0 ? (
                <p className="profile-empty">Belum ada permintaan data.</p>
              ) : (
                <ul className="profile-request-list">
                  {profile.dataRequests.map((dataRequest) => (
                    <li key={dataRequest.id}>
                      <div>
                        <strong>{requestLabels[dataRequest.type]}</strong>
                        <span>{formatDate(dataRequest.createdAt)} · {requestStatusLabels[dataRequest.status]}</span>
                        {dataRequest.details && <small>{dataRequest.details}</small>}
                        {dataRequest.resolution && <small>Catatan admin: {dataRequest.resolution}</small>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <div className="profile-signin">
            <p>Silakan masuk ke Fuel Card untuk mengakses profil dan mengajukan permintaan data.</p>
            <Link className="button button-primary" href="/kartu">Masuk ke Fuel Card ↗</Link>
          </div>
        )}
      </section>
      <footer className="site-footer">
        <div className="footer-bottom section-wrap">
          <Link href="/">← Cartive</Link>
          <Link href="/syarat">Syarat Fuel Card</Link>
        </div>
      </footer>
    </main>
  );
}
