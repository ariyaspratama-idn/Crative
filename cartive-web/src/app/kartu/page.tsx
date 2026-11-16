import type { Metadata } from "next";
import KartuClient from "@/components/kartu-client";

export const metadata: Metadata = {
  title: "Fuel Card — Cartive",
  description: "Masuk ke Fuel Card Cartive untuk melihat stamp dan mengirim klaim pembelian.",
  robots: { index: false, follow: false },
};

export default function KartuPage() {
  return <KartuClient />;
}
