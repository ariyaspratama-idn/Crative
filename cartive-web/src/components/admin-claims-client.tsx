"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminDataRequestsPanel from "@/components/admin-data-requests-panel";
import AdminOrdersPanel from "@/components/admin-orders-panel";
import AdminInventoryPanel from "@/components/admin-inventory-panel";
import AdminProductsPanel from "@/components/admin-products-panel";

type Claim = {
  id: string;
  platform: "GOFOOD" | "GRABFOOD" | "SHOPEEFOOD";
  orderId: string;
  claimedBottleCount: number;
  orderedAt: string | null;
  createdAt: string;
  memberWa: string;
  receiptAvailable: boolean;
};

type Queue = { claims: Claim[]; nextCursor: string | null };
type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

const platformLabels: Record<Claim["platform"], string> = {
  GOFOOD: "GoFood",
  GRABFOOD: "GrabFood",
  SHOPEEFOOD: "ShopeeFood",
};

const rewardLabels = {
  VOUCHER_2K: "Voucher Rp2.000",
  FREE_BOTTLE: "1 botol gratis",
} as const;

const rejectionReasons = [
  ["ORDER_NOT_FOUND", "Pesanan tidak ditemukan"],
  ["ORDER_ID_MISMATCH", "ID pesanan tidak cocok"],
  ["RECEIPT_UNREADABLE", "Foto struk tidak terbaca"],
  ["BOTTLE_COUNT_MISMATCH", "Jumlah botol tidak cocok"],
  ["OUTSIDE_CLAIM_WINDOW", "Di luar waktu klaim"],
  ["OTHER", "Alasan lainnya"],
] as const;

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || body.error || body.data === null) {
    throw new Error(body.error?.message ?? "Permintaan belum dapat diproses.");
  }
  return body.data;
}

function ClaimCard({
  claim,
  onReviewed,
}: {
  claim: Claim;
  onReviewed: (message: string) => void;
}) {
  const [reasonCode, setReasonCode] = useState<(typeof rejectionReasons)[number][0]>(
    rejectionReasons[0][0],
  );
  const [reasonNote, setReasonNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function review(decision: "APPROVE" | "REJECT") {
    setBusy(true);
    setError("");
    try {
      const body =
        decision === "APPROVE"
          ? { decision }
          : { decision, reasonCode, reasonNote: reasonNote.trim() || undefined };
      const response = await fetch(
        `/api/v1/admin/claims/${encodeURIComponent(claim.id)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = await readResponse<{ stampsAdded: number }>(response);
      onReviewed(
        decision === "APPROVE"
          ? `Klaim disetujui; ${result.stampsAdded} stamp ditambahkan.`
          : "Klaim ditolak dan alasan dicatat.",
      );
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Keputusan belum dapat disimpan.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="admin-claim-card">
      {claim.receiptAvailable ? (
        <a
          className="admin-receipt"
          href={`/api/v1/admin/claims/${encodeURIComponent(claim.id)}/receipt`}
          target="_blank"
          rel="noreferrer"
        >
          <Image
            src={`/api/v1/admin/claims/${encodeURIComponent(claim.id)}/receipt`}
            alt={`Foto struk pesanan ${claim.orderId}`}
            width={800}
            height={600}
            unoptimized
          />
          <span>Buka foto struk</span>
        </a>
      ) : (
        <div className="admin-receipt admin-receipt-missing">Foto struk tidak tersedia</div>
      )}
      <div className="admin-claim-details">
        <div className="admin-claim-heading">
          <div>
            <p className="admin-eyebrow">{platformLabels[claim.platform]}</p>
            <h2>{claim.orderId}</h2>
          </div>
          <span className="admin-claim-count">{claim.claimedBottleCount} botol</span>
        </div>
        <p className="admin-claim-meta">
          WhatsApp {claim.memberWa} · Pesanan{" "}
          {claim.orderedAt ? new Date(claim.orderedAt).toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Jakarta",
          }) : "waktu lama belum tercatat"} · Diajukan{" "}
          {new Date(claim.createdAt).toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Jakarta",
          })}
        </p>
        <label className="admin-field">
          Alasan penolakan
          <select
            value={reasonCode}
            onChange={(event) =>
              setReasonCode(event.target.value as (typeof rejectionReasons)[number][0])
            }
            disabled={busy}
          >
            {rejectionReasons.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {reasonCode === "OTHER" && (
          <label className="admin-field">
            Penjelasan
            <textarea
              value={reasonNote}
              onChange={(event) => setReasonNote(event.target.value)}
              maxLength={250}
              rows={2}
              disabled={busy}
            />
          </label>
        )}
        {error && <p className="admin-error" role="alert">{error}</p>}
        <div className="admin-claim-actions">
          <button
            type="button"
            className="admin-button admin-button-reject"
            disabled={busy || (reasonCode === "OTHER" && !reasonNote.trim())}
            onClick={() => void review("REJECT")}
          >
            Tolak klaim
          </button>
          <button
            type="button"
            className="admin-button admin-button-approve"
            disabled={busy}
            onClick={() => void review("APPROVE")}
          >
            Setujui · +{claim.claimedBottleCount} stamp
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminClaimsClient({ adminEmail }: { adminEmail: string }) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyingNumber, setVerifyingNumber] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [rewardCode, setRewardCode] = useState("");
  const [redeemingReward, setRedeemingReward] = useState(false);
  const [rewardError, setRewardError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function signOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      const response = await fetch("/api/v1/admin/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sesi belum dapat diakhiri.");
      window.location.reload();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Sesi belum dapat diakhiri.");
    } finally {
      setSigningOut(false);
    }
  }

  const loadQueue = useCallback(async (cursor?: string, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const queue = await readResponse<Queue>(
        await fetch(`/api/v1/admin/claims${query}`, { cache: "no-store" }),
      );
      setClaims((current) => (append ? [...current, ...queue.claims] : queue.claims));
      setNextCursor(queue.nextCursor);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Antrean klaim belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadQueue());
  }, [loadQueue]);

  async function handleReviewed(message: string) {
    setNotice(message);
    await loadQueue();
  }

  async function handleVerifyWhatsApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifyingNumber(true);
    setVerificationError("");
    setNotice("");
    try {
      const response = await fetch("/api/v1/admin/wa-verifications/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      });
      const result = await readResponse<{ waNumber: string }>(response);
      setVerificationCode("");
      setNotice(`Nomor ${result.waNumber} berhasil diverifikasi.`);
    } catch (verifyError) {
      setVerificationError(
        verifyError instanceof Error
          ? verifyError.message
          : "Verifikasi nomor belum dapat diselesaikan.",
      );
    } finally {
      setVerifyingNumber(false);
    }
  }

  async function handleRedeemReward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRedeemingReward(true);
    setRewardError("");
    setNotice("");
    try {
      const response = await fetch("/api/v1/admin/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: rewardCode }),
      });
      const result = await readResponse<{
        type: keyof typeof rewardLabels;
        waNumber: string;
      }>(response);
      setRewardCode("");
      setNotice(`${rewardLabels[result.type]} untuk ${result.waNumber} berhasil ditandai digunakan.`);
    } catch (redeemError) {
      setRewardError(
        redeemError instanceof Error
          ? redeemError.message
          : "Kode reward belum dapat diproses.",
      );
    } finally {
      setRedeemingReward(false);
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="admin-wordmark" href="/" aria-label="Kembali ke toko Cartive">
          <span className="wordmark-mark">c.</span>
          <span>cartive</span>
          <span className="admin-wordmark-label">STUDIO ADMIN</span>
        </Link>
        <div className="admin-header-account">
          <span className="admin-account-indicator" aria-hidden="true" />
          <span>Masuk sebagai <strong>{adminEmail}</strong></span>
          <Link className="admin-store-link" href="/">Lihat toko <span aria-hidden="true">↗</span></Link>
          {adminEmail !== "local-dev@cartive.test" && (
            <button className="admin-button" type="button" onClick={() => void signOut()} disabled={signingOut}>
              {signingOut ? "Keluar..." : "Keluar"}
            </button>
          )}
        </div>
      </header>
      <section className="admin-content">
        {signOutError && <p className="admin-error" role="alert">{signOutError}</p>}
        {adminEmail === "local-dev@cartive.test" && (
          <p className="admin-notice admin-dev-banner" role="note">
            <span className="admin-dev-banner-icon" aria-hidden="true">⌘</span>
            <span><strong>Mode pengembangan lokal</strong>Panel ini hanya tersedia di komputer ini dan tidak dibuka di production.</span>
          </p>
        )}
        <div className="admin-title-row">
          <div>
            <p className="admin-eyebrow">FUEL CARD · ADMIN</p>
            <h1>Ruang kendali <em>Cartive.</em></h1>
            <p className="admin-description">
              Pantau aktivitas, periksa klaim, dan kelola operasional toko dari satu tempat.
            </p>
          </div>
          <button
            className="admin-button admin-button-refresh"
            type="button"
            onClick={() => void loadQueue()}
            disabled={loading}
          >
            Muat ulang
          </button>
        </div>
        <nav className="admin-section-nav" aria-label="Navigasi bagian admin">
          <a href="#klaim"><span>01</span> Klaim Fuel Card</a>
          <a href="#verifikasi"><span>02</span> Verifikasi & reward</a>
          <a href="#pesanan"><span>03</span> Pesanan web</a>
          <a href="#produk"><span>04</span> Katalog produk</a>
          <a href="#inventaris"><span>05</span> Inventaris</a>
          <a href="#permintaan-data"><span>06</span> Permintaan data</a>
        </nav>
        <div className="admin-utility-grid">
          <section className="admin-verification-panel" id="verifikasi">
            <div className="admin-panel-heading">
              <span className="admin-panel-icon" aria-hidden="true">01</span>
              <div>
                <p className="admin-eyebrow">VERIFIKASI PELANGGAN</p>
                <h2>Konfirmasi nomor WhatsApp</h2>
                <p>
                  Masukkan kode yang pelanggan kirim dari nomor WhatsApp-nya ke nomor resmi Cartive.
                  Kode yang belum diterima melalui pesan jangan dikonfirmasi.
                </p>
              </div>
            </div>
            <form onSubmit={handleVerifyWhatsApp}>
              <label className="admin-field">
                Kode verifikasi
                <input
                  autoComplete="off"
                  inputMode="text"
                  maxLength={10}
                  pattern="[A-Fa-f0-9]{10}"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.toUpperCase())}
                  required
                />
              </label>
              <button
                className="admin-button admin-button-approve"
                type="submit"
                disabled={verifyingNumber || verificationCode.length !== 10}
              >
                {verifyingNumber ? "Memverifikasi…" : "Konfirmasi nomor"}
              </button>
            </form>
            {verificationError && (
              <p className="admin-error" role="alert">{verificationError}</p>
            )}
          </section>
          <section className="admin-verification-panel" id="reward">
            <div className="admin-panel-heading">
              <span className="admin-panel-icon admin-panel-icon-warm" aria-hidden="true">02</span>
              <div>
                <p className="admin-eyebrow">PESANAN WHATSAPP</p>
                <h2>Validasi kode reward</h2>
                <p>
                  Tandai kode sudah digunakan setelah hadiah diterapkan. Setiap kode hanya dapat
                  dipakai satu kali.
                </p>
              </div>
            </div>
            <form onSubmit={handleRedeemReward}>
              <label className="admin-field">
                Kode reward
                <input
                  autoComplete="off"
                  maxLength={16}
                  minLength={6}
                  pattern="(?:[A-HJ-NP-Z2-9]{6}|[A-Fa-f0-9]{16})"
                  value={rewardCode}
                  onChange={(event) => setRewardCode(event.target.value.toUpperCase())}
                  required
                />
              </label>
              <button
                className="admin-button admin-button-approve"
                type="submit"
                disabled={redeemingReward || ![6, 16].includes(rewardCode.length)}
              >
                {redeemingReward ? "Memvalidasi…" : "Tandai sudah digunakan"}
              </button>
            </form>
            {rewardError && <p className="admin-error" role="alert">{rewardError}</p>}
          </section>
        </div>
        <section className="admin-queue-section" id="klaim">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">FUEL CARD · PEMERIKSAAN MANUAL</p>
              <h2>Antrean klaim</h2>
              <p className="admin-description">Periksa kecocokan ID pesanan dan struk sebelum memberi stamp.</p>
            </div>
            <span className="admin-queue-count">{claims.length} klaim</span>
          </div>
          {notice && <p className="admin-notice" role="status">{notice}</p>}
          {error && <p className="admin-error" role="alert">{error}</p>}
          {loading ? (
            <p className="admin-empty">Memuat antrean…</p>
          ) : claims.length === 0 ? (
            <p className="admin-empty">Tidak ada klaim yang menunggu pemeriksaan.</p>
          ) : (
            <div className="admin-claim-list">
              {claims.map((claim) => (
                <ClaimCard key={claim.id} claim={claim} onReviewed={handleReviewed} />
              ))}
            </div>
          )}
          {nextCursor && !loading && (
            <button
              className="admin-button admin-button-refresh admin-load-more"
              type="button"
              disabled={loadingMore}
              onClick={() => void loadQueue(nextCursor, true)}
            >
              {loadingMore ? "Memuat…" : "Muat klaim berikutnya"}
            </button>
          )}
        </section>
        <AdminOrdersPanel />
        <AdminProductsPanel />
        <AdminInventoryPanel />
        <AdminDataRequestsPanel />
      </section>
    </main>
  );
}
