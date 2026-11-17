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
              <input
                type="password"
                autoComplete="current-password"
                required
                maxLength={256}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
              />
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
