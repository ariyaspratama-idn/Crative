import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { AdminAuthConfigurationError, getAdminIdentity } from "@/lib/admin-auth";
import AdminClaimsClient from "@/components/admin-claims-client";
import AdminLogin from "@/components/admin-login";

export const metadata: Metadata = {
  title: "Review klaim — Cartive",
  robots: { index: false, follow: false },
};

async function AdminPageContent() {
  let email: string | null;
  try {
    email = await getAdminIdentity(await headers());
  } catch (error) {
    if (error instanceof AdminAuthConfigurationError) {
      return (
        <main className="admin-shell">
          <p className="admin-error" role="alert">
            Panel admin belum dikonfigurasi. Atur ADMIN_EMAILS, ADMIN_PASSWORD,
            dan ADMIN_SESSION_SECRET pada environment deployment.
          </p>
        </main>
      );
    }
    throw error;
  }
  if (!email) return <AdminLogin />;

  return <AdminClaimsClient adminEmail={email} />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<main className="admin-shell"><p className="admin-empty">Memuat panel admin…</p></main>}>
      <AdminPageContent />
    </Suspense>
  );
}
