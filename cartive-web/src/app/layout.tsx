import type { Metadata } from "next";
import ServiceWorkerRegistration from "@/components/service-worker-registration";
import { ThemeProvider } from "@/components/theme-provider";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import "./globals.css";

const metadataBase = getPublicSiteUrl();

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  ...(process.env.CARTIVE_DEPLOYMENT_ENV === "staging" ||
  process.env.VERCEL_ENV === "preview"
    ? { robots: { index: false, follow: false } }
    : {}),
  title: "Cartive — Kopi botol, teman jalan",
  description:
    "Kopi siap minum Cartive untuk menemani ide, kerja, dan jeda kecil di tengah harimu. Kenali menu dan Fuel Card Cartive.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Cartive", statusBarStyle: "default" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body>
        <ThemeProvider>
          {children}
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
