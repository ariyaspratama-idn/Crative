"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import OneSignalPushSettings from "@/components/onesignal-push-settings";
import TurnstileWidget from "@/components/turnstile-widget";
import { unlinkOneSignalMember } from "@/lib/onesignal-client";

type MemberCard = {
  id: string;
  waNumber: string;
  waVerified: boolean;
  stamps: number;
  progressToBottle: number;
};

type Claim = {
  id: string;
  platform: "GOFOOD" | "GRABFOOD" | "SHOPEEFOOD";
  orderId: string;
  claimedBottleCount: number;
  status: "NEEDS_REVIEW" | "APPROVED" | "REJECTED" | "WAITING_REPORT";
  reasonCode: string | null;
  createdAt: string;
};

type Reward = {
  id: string;
  type: "VOUCHER_2K" | "FREE_BOTTLE";
  code: string;
  status: "AVAILABLE" | "USED" | "EXPIRED";
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
};

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

const platformLabels: Record<Claim["platform"], string> = {
  GOFOOD: "GoFood",
  GRABFOOD: "GrabFood",
  SHOPEEFOOD: "ShopeeFood",
};

const claimStatus: Record<Claim["status"], string> = {
  NEEDS_REVIEW: "Menunggu pemeriksaan",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  WAITING_REPORT: "Menunggu laporan toko",
};

const rewardLabels: Record<Reward["type"], string> = {
  VOUCHER_2K: "Voucher Rp2.000",
  FREE_BOTTLE: "1 botol gratis",
};

const rewardStatusLabels: Record<Reward["status"], string> = {
  AVAILABLE: "Siap digunakan",
  USED: "Sudah digunakan",
  EXPIRED: "Kedaluwarsa",
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Terjadi kendala yang belum diketahui. Silakan coba lagi.";
}

async function readResponse<T>(response: Response) {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || body.error || body.data === null) {
    throw new Error(body.error?.message ?? "Permintaan belum dapat diproses.");
  }
  return body.data;
}

export default function KartuClient() {
  const [member, setMember] = useState<MemberCard | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loginChallengeId, setLoginChallengeId] = useState("");
  const [loginCodeRequested, setLoginCodeRequested] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loginWebsite, setLoginWebsite] = useState("");
  const [loginTurnstileResetKey, setLoginTurnstileResetKey] = useState(0);
  const [claimTurnstileToken, setClaimTurnstileToken] = useState("");
  const [claimTurnstileResetKey, setClaimTurnstileResetKey] = useState(0);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [promoConsent, setPromoConsent] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const [verificationUrl, setVerificationUrl] = useState("");

  const loadMember = useCallback(async (): Promise<MemberCard | null> => {
    try {
      const response = await fetch("/api/v1/me", { cache: "no-store" });
      if (response.status === 401) {
        setMember(null);
        setClaims([]);
        setRewards([]);
        return null;
      }
      const currentMember = await readResponse<MemberCard>(response);
      setMember(currentMember);
      const [claimResponse, rewardResponse] = await Promise.all([
        fetch("/api/v1/claims", { cache: "no-store" }),
        fetch("/api/v1/rewards", { cache: "no-store" }),
      ]);
      const [currentClaims, currentRewards] = await Promise.all([
        readResponse<Claim[]>(claimResponse),
        readResponse<Reward[]>(rewardResponse),
      ]);
      setClaims(currentClaims ?? []);
      setRewards(currentRewards ?? []);
      return currentMember;
    } catch (error) {
      setPageError(getErrorMessage(error));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadMember);
  }, [loadMember]);

  async function requestLoginCode() {
    setBusy(true);
    setPageError("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/v1/auth/wa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waNumber,
          consentPrivacy: privacyConsent,
          consentPromo: promoConsent,
          turnstileToken,
          website: loginWebsite,
        }),
      });
      const result = await readResponse<{
        challengeId: string;
        codeSent: boolean;
        expiresAt: string;
        developmentCode?: string;
      }>(response);
      setLoginChallengeId(result.challengeId);
      setLoginCodeRequested(true);
      setLoginCode("");
      setSuccessMessage(result.developmentCode
        ? `Mode pengembangan lokal: gunakan kode ${result.developmentCode}.`
        : "Kode masuk telah dikirim ke WhatsApp tersebut. Masukkan kode untuk membuka Fuel Card.");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setTurnstileToken("");
      setLoginTurnstileResetKey((current) => current + 1);
      setBusy(false);
    }
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestLoginCode();
  }

  async function handleConfirmSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setPageError("");
    setSuccessMessage("");
    try {
      await readResponse<{ signedIn: boolean }>(await fetch("/api/v1/auth/wa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: loginChallengeId, code: loginCode }),
      }));
      setLoginCodeRequested(false);
      setLoginChallengeId("");
      setLoginCode("");
      await loadMember();
      setSuccessMessage("Nomor WhatsApp terverifikasi dan Fuel Card siap digunakan.");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleStartWaVerification() {
    setBusy(true);
    setPageError("");
    setSuccessMessage("");
    setVerificationUrl("");
    try {
      const response = await fetch("/api/v1/auth/wa/verification", {
        method: "POST",
      });
      const data = await readResponse<{ whatsappUrl: string }>(response);
      setVerificationUrl(data?.whatsappUrl ?? "");
      setSuccessMessage("Pesan verifikasi siap. Kirim dari nomor WhatsApp yang tercantum di Fuel Card.");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleRefreshStatus() {
    setBusy(true);
    setPageError("");
    setSuccessMessage("");
    const refreshedMember = await loadMember();
    if (refreshedMember) {
      setSuccessMessage(
        refreshedMember.waVerified
          ? "Status diperbarui. Nomor WhatsApp kamu sudah terverifikasi."
          : "Status diperbarui. Verifikasi WhatsApp masih menunggu konfirmasi admin.",
      );
    }
    setBusy(false);
  }

  async function handleClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("turnstileToken", claimTurnstileToken);
    setBusy(true);
    setPageError("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/v1/claims", { method: "POST", body: formData });
      const data = await readResponse<{ message: string }>(response);
      form.reset();
      setSuccessMessage(data?.message ?? "Klaim diterima dan menunggu pemeriksaan.");
      await loadMember();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setClaimTurnstileToken("");
      setClaimTurnstileResetKey((current) => current + 1);
      setBusy(false);
    }
  }

  async function handleReward(type: Reward["type"]) {
    setBusy(true);
    setPageError("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/v1/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const result = await readResponse<{
        reward: Reward;
        stampsRemaining: number;
      }>(response);
      await loadMember();
      setSuccessMessage(
        `${rewardLabels[type]} berhasil ditukar. Kode ${result.reward.code} berlaku tujuh hari dan dapat digunakan di checkout atau pesanan WhatsApp.`,
      );
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setPageError("");
    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST" });
      await readResponse(response);
      void unlinkOneSignalMember().catch((error: unknown) => {
        console.error("OneSignal identity could not be cleared during sign-out.", error);
      });
      setMember(null);
      setClaims([]);
      setRewards([]);
      setSuccessMessage("Kamu sudah keluar dari Fuel Card.");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={isDark ? "site-shell theme-dark loyalty-page" : "site-shell loyalty-page"}>
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Cartive, ke beranda">
          <span className="wordmark-mark">c.</span>
          <span>cartive</span>
        </Link>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          <Link href="/#menu">Menu</Link>
          <Link href="/#cerita">Cerita kami</Link>
          <Link href="/profil">Profil</Link>
        </nav>
        <div className="header-actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
          >
            <span aria-hidden="true">{isDark ? "☼" : "◐"}</span>
          </button>
        </div>
      </header>

      <section className="loyalty-hero section-wrap">
        <Link className="back-link" href="/">← Kembali ke Cartive</Link>
        <p className="eyebrow"><span className="eyebrow-dot" /> CARTIVE FUEL CARD</p>
        <h1>Setiap botol,<br /><em>selangkah lebih dekat.</em></h1>
        <p className="loyalty-lead">Kumpulkan stamp dari pembelian Cartive. Lihat progres dan klaim pembelianmu di sini.</p>

        {pageError && <p className="form-alert form-alert-error" role="alert">{pageError}</p>}
        {successMessage && <p className="form-alert form-alert-success" role="status">{successMessage}</p>}

        {loading ? (
          <div className="loyalty-loading" role="status">Memeriksa Fuel Card…</div>
        ) : member ? (
          <div className="member-dashboard">
            <section className="member-card">
              <div className="member-card-heading">
                <div>
                  <p className="member-label">FUEL CARD MILIK</p>
                  <h2>{member.waNumber}</h2>
                </div>
                <button className="quiet-button" type="button" onClick={handleSignOut} disabled={busy}>Keluar</button>
              </div>
              <div className="stamp-grid stamp-grid-dashboard" aria-label={`${member.progressToBottle} dari 7 stamp menuju satu botol gratis`}>
                {Array.from({ length: 7 }, (_, index) => (
                  <span className={index < member.progressToBottle ? "stamp filled" : "stamp"} key={index}>
                    <span aria-hidden="true">{index < member.progressToBottle ? "✳" : ""}</span>
                  </span>
                ))}
              </div>
              <div className="dashboard-progress">
                <span><strong>{member.stamps}</strong> stamp tersedia</span>
                <span>{7 - member.progressToBottle} lagi ke botol gratis</span>
              </div>
              <div className="progress-track"><span style={{ width: `${(member.progressToBottle / 7) * 100}%` }} /></div>
              <div className="reward-summary">
                <span className="reward-icon" aria-hidden="true">✳</span>
                <span><strong>3 stamp</strong> · voucher Rp2.000</span>
                <span><strong>7 stamp</strong> · 1 botol gratis</span>
              </div>
              <p className="verification-note">
                {member.waVerified
                  ? "Nomor WhatsApp kamu sudah terverifikasi."
                  : "Verifikasi WhatsApp dibutuhkan sebelum hadiah dapat ditukar."}
              </p>
              <OneSignalPushSettings memberId={member.id} />
              {!member.waVerified && (
                <div className="verification-actions">
                  <button
                    className="quiet-button"
                    type="button"
                    onClick={() => void handleStartWaVerification()}
                    disabled={busy}
                  >
                    {busy ? "Menyiapkan pesan…" : "Mulai verifikasi WhatsApp"}
                  </button>
                  {verificationUrl && (
                    <a
                      className="verification-link"
                      href={verificationUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Buka WhatsApp dan kirim pesan
                    </a>
                  )}
                  <button
                    className="quiet-button"
                    type="button"
                    onClick={() => void handleRefreshStatus()}
                    disabled={busy}
                  >
                    Perbarui status verifikasi
                  </button>
                  <p className="verification-note">
                    Admin Cartive akan mencocokkan kode dari pesan yang kamu kirim. Kode berlaku 24 jam.
                  </p>
                </div>
              )}
            </section>

            <section className="loyalty-panel rewards-panel">
              <div className="history-heading">
                <div>
                  <p className="eyebrow">TUKAR STAMP</p>
                  <h2>Hadiahmu</h2>
                </div>
                <Link className="product-link" href="/menu">Pesan kopi ↗</Link>
              </div>
              <p className="panel-description">
                Stamp langsung dipotong saat kode dibuat. Kode berlaku tujuh hari; gunakan di checkout
                web atau sampaikan kepada admin saat memesan melalui WhatsApp.
              </p>
              <div className="reward-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => void handleReward("VOUCHER_2K")}
                  disabled={busy || !member.waVerified || member.stamps < 3}
                >
                  Tukar 3 stamp · Voucher Rp2.000
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => void handleReward("FREE_BOTTLE")}
                  disabled={busy || !member.waVerified || member.stamps < 7}
                >
                  Tukar 7 stamp · 1 botol gratis
                </button>
              </div>
              {!member.waVerified && (
                <p className="verification-note">Verifikasi WhatsApp untuk membuka penukaran hadiah.</p>
              )}
              {rewards.length > 0 && (
                <ul className="reward-list">
                  {rewards.map((reward) => (
                    <li className="reward-item" key={reward.id}>
                      <span>
                        <strong>{rewardLabels[reward.type]}</strong>
                        <small>
                          {rewardStatusLabels[reward.status]} · {new Date(reward.createdAt).toLocaleDateString("id-ID")}
                          {reward.expiresAt ? ` · berlaku sampai ${new Date(reward.expiresAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}` : ""}
                        </small>
                      </span>
                      <code>{reward.code}</code>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="loyalty-columns">
              <section className="loyalty-panel claim-panel">
                <p className="eyebrow">PEMBELIAN DI PLATFORM</p>
                <h2>Klaim stamp</h2>
                <p className="panel-description">Isi data pesanan dan kirim foto struk. Maksimal 48 jam setelah waktu pesanan.</p>
                <form className="loyalty-form" onSubmit={handleClaim}>
                  <label>
                    Platform pembelian
                    <select name="platform" defaultValue="GOFOOD" required>
                      <option value="GOFOOD">GoFood</option>
                      <option value="GRABFOOD">GrabFood</option>
                      <option value="SHOPEEFOOD">ShopeeFood</option>
                    </select>
                  </label>
                  <div className="form-row">
                    <label className="field-grow">
                      Order ID
                      <input name="orderId" autoComplete="off" maxLength={80} placeholder="Contoh: ID pesanan di aplikasi" required />
                    </label>
                    <label className="quantity-field">
                      Jumlah botol
                      <select name="bottleCount" defaultValue="1" required>
                        {[1, 2, 3, 4, 5, 6].map((number) => <option value={number} key={number}>{number}</option>)}
                      </select>
                    </label>
                  </div>
                  <label>
                    Waktu pesanan (WIB)
                    <input
                      name="orderedAt"
                      type="datetime-local"
                      required
                    />
                    <span className="field-hint">Gunakan waktu pada struk; klaim maksimal 48 jam setelah pesanan.</span>
                  </label>
                  <label>
                    Foto struk
                    <input name="receipt" type="file" accept="image/jpeg,image/png,image/webp,image/heic" required />
                    <span className="field-hint">JPG, PNG, WEBP, atau HEIC · maksimal 5 MB</span>
                  </label>
                  <label
                    className="honeypot-field"
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      width: 1,
                      height: 1,
                      overflow: "hidden",
                      clipPath: "inset(50%)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Situs web
                    <input name="website" type="text" autoComplete="off" aria-hidden="true" tabIndex={-1} />
                  </label>
                  <TurnstileWidget
                    key={claimTurnstileResetKey}
                    action="claim"
                    onToken={setClaimTurnstileToken}
                  />
                  <button className="button button-primary submit-button" type="submit" disabled={busy}>
                    {busy ? "Mengirim…" : "Kirim klaim"} <span aria-hidden="true">↗</span>
                  </button>
                  <p className="review-disclaimer">Semua klaim diperiksa manual. Stamp baru masuk setelah klaim disetujui.</p>
                </form>
              </section>

              <section className="loyalty-panel history-panel">
                <div className="history-heading">
                  <div>
                    <p className="eyebrow">PERJALANANMU</p>
                    <h2>Riwayat klaim</h2>
                  </div>
                  <span className="history-count">{claims.length}</span>
                </div>
                {claims.length === 0 ? (
                  <div className="empty-claims">
                    <span aria-hidden="true">✳</span>
                    <p>Belum ada klaim. Setelah pembelian, kirim klaim pertamamu di sini.</p>
                  </div>
                ) : (
                  <ul className="claim-list">
                    {claims.map((claim) => (
                      <li className="claim-item" key={claim.id}>
                        <span className={`claim-status-dot status-${claim.status.toLowerCase()}`} />
                        <div className="claim-item-main">
                          <strong>{platformLabels[claim.platform]} · {claim.claimedBottleCount} botol</strong>
                          <span>ID {claim.orderId} · {new Date(claim.createdAt).toLocaleDateString("id-ID")}</span>
                          {claim.reasonCode && <small>{claim.reasonCode}</small>}
                        </div>
                        <span className={`claim-status status-${claim.status.toLowerCase()}`}>{claimStatus[claim.status]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        ) : (
          <div className="sign-in-card">
            <div className="sign-in-copy">
              <span className="sign-in-symbol" aria-hidden="true">✳</span>
              <h2>Mulai kumpulkan stamp.</h2>
              <p>Masuk dengan nomor WhatsApp. Tidak perlu kata sandi.</p>
            </div>
            <form className="loyalty-form" onSubmit={loginCodeRequested ? handleConfirmSignIn : handleSignIn}>
              {!loginCodeRequested ? (
                <>
                  <label
                    className="honeypot-field"
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      width: 1,
                      height: 1,
                      overflow: "hidden",
                      clipPath: "inset(50%)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Situs web
                    <input
                      autoComplete="off"
                      onChange={(event) => setLoginWebsite(event.target.value)}
                      aria-hidden="true"
                      tabIndex={-1}
                      type="text"
                      value={loginWebsite}
                    />
                  </label>
                  <label>
                    Nomor WhatsApp
                    <input
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={24}
                      onChange={(event) => setWaNumber(event.target.value)}
                      placeholder="08xx atau +62xx"
                      required
                      type="tel"
                      value={waNumber}
                    />
                  </label>
                  <label className="consent-option">
                    <input
                      checked={privacyConsent}
                      onChange={(event) => setPrivacyConsent(event.target.checked)}
                      required
                      type="checkbox"
                    />
                    <span>Saya menyetujui <Link href="/privasi">Kebijakan Privasi</Link> Cartive.</span>
                  </label>
                  <label className="consent-option">
                    <input checked={promoConsent} onChange={(event) => setPromoConsent(event.target.checked)} type="checkbox" />
                    <span>Saya bersedia menerima informasi promosi Cartive lewat WhatsApp. (Opsional)</span>
                  </label>
                  <TurnstileWidget
                    key={loginTurnstileResetKey}
                    action="login"
                    onToken={setTurnstileToken}
                  />
                  <button className="button button-primary submit-button" type="submit" disabled={busy || !privacyConsent}>
                    {busy ? "Mengirim kode…" : "Kirim kode masuk"} <span aria-hidden="true">↗</span>
                  </button>
                  <p className="review-disclaimer">Kami mengirim kode satu kali ke nomor WhatsApp yang kamu masukkan. Promo hanya dikirim jika kamu menyetujuinya.</p>
                </>
              ) : (
                <>
                  <p className="review-disclaimer">Masukkan kode yang dikirim ke {waNumber}. Kode berlaku 10 menit.</p>
                  <label>
                    Kode masuk
                    <input
                      autoComplete="one-time-code"
                      inputMode="text"
                      maxLength={6}
                      minLength={6}
                      onChange={(event) => setLoginCode(event.target.value.toUpperCase())}
                      pattern="[A-HJ-NP-Z2-9]{6}"
                      required
                      value={loginCode}
                    />
                  </label>
                  <button className="button button-primary submit-button" type="submit" disabled={busy || loginCode.length !== 6}>
                    {busy ? "Memverifikasi…" : "Verifikasi dan masuk"} <span aria-hidden="true">↗</span>
                  </button>
                  <button className="quiet-button" type="button" onClick={() => { setLoginCodeRequested(false); setLoginChallengeId(""); setLoginCode(""); setPageError(""); }}>
                    Ganti nomor WhatsApp
                  </button>
                  <button
                    className="quiet-button"
                    type="button"
                    onClick={() => {
                      setLoginCodeRequested(false);
                      setLoginChallengeId("");
                      setLoginCode("");
                      setTurnstileToken("");
                      setLoginWebsite("");
                      setPageError("");
                    }}
                    disabled={busy}
                  >
                    Minta kode baru
                  </button>
                </>
              )}
            </form>
          </div>
        )}
      </section>

      <footer className="site-footer loyalty-footer">
        <div className="footer-bottom section-wrap">
          <Link href="/">← Cartive</Link>
          <div className="loyalty-footer-links">
            <Link href="/cara-kerja">Cara kerja</Link>
            <Link href="/syarat">Syarat</Link>
            <Link href="/privasi">Privasi</Link>
            <Link href="/profil">Profil</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
