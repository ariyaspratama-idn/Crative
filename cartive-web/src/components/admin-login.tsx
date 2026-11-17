"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type LoginResponse = {
  data: { email: string } | null;
  error: { message: string } | null;
};

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as LoginResponse;
      if (!response.ok || !result.data) {
        throw new Error(result.error?.message ?? "Login belum dapat diproses.");
      }
      window.location.reload();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login belum dapat diproses.");
    } finally {
      setBusy(false);
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
        <Link className="admin-store-link" href="/">Lihat toko <span aria-hidden="true">↗</span></Link>
      </header>
      <section className="admin-content admin-login-content">
        <div className="admin-login-card">
          <p className="admin-eyebrow">AKSES TERBATAS</p>
          <h1>Masuk ke panel admin</h1>
          <p className="admin-description">Gunakan email admin yang terdaftar dan kata sandi admin.</p>
          <form onSubmit={submit}>
            <label className="admin-field">
              Email admin
              <input
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
              />
            </label>
            <label className="admin-field">
              Kata sandi
              <span className="admin-password-control">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  maxLength={256}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={busy}
                />
                <button
                  className="admin-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  aria-pressed={showPassword}
                  disabled={busy}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                    {showPassword ? (
                      <>
                        <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 8.6 4.3 9.5 6-.4.8-1.4 2.1-2.8 3.2M6.2 6.2C3.9 7.5 2.7 9.5 2.5 11c.9 1.7 4.3 6 9.5 6 1 0 1.9-.2 2.7-.5" />
                      </>
                    ) : (
                      <>
                        <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </>
                    )}
                  </svg>
                  <span className="sr-only">{showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}</span>
                </button>
              </span>
            </label>
            {error && <p className="admin-error" role="alert">{error}</p>}
            <button className="admin-button admin-button-approve" type="submit" disabled={busy}>
              {busy ? "Memeriksa..." : "Masuk"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
