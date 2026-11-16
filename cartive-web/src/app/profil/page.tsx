import type { Metadata } from "next";
import ProfileSettingsClient from "@/components/profile-settings-client";

export const metadata: Metadata = {
  title: "Profil dan privasi — Cartive",
  description: "Kelola persetujuan promosi dan ajukan permintaan data Fuel Card Cartive.",
  robots: { index: false, follow: false },
};

export default function ProfilPage() {
  return <ProfileSettingsClient />;
}
