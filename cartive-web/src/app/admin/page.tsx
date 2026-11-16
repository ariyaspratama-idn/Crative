import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  AdminAuthConfigurationError,
  AdminAuthUnavailableError,
  getAdminIdentity,
} from "@/lib/admin-auth";
import AdminClaimsClient from "@/components/admin-claims-client";

export const metadata: Metadata = {
  title: "Review klaim — Cartive",
  robots: { index: false, follow: false },
};

async function AdminPageContent() {
  let email: string | null;
  try {
    email = await getAdminIdentity(await headers());
  } catch (error) {
    if (
      error instanceof AdminAuthConfigurationError ||
      error instanceof AdminAuthUnavailableError
    ) {
      return (
        <main className="admin-shell">
          <p className="admin-error" role="alert">
            Panel admin belum dapat dibuka. Konfigurasi Cloudflare Access harus
            lengkap dan layanan verifikasi akses tersedia.
          </p>
        </main>
      );
    }
    throw error;
  }
  if (!email) notFound();

  return <AdminClaimsClient adminEmail={email} />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<main className="admin-shell"><p className="admin-empty">Memuat panel admin…</p></main>}>
      <AdminPageContent />
    </Suspense>
  );
}
