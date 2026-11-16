import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cara kerja Fuel Card — Cartive",
  description: "Panduan mengklaim stamp dan menukar hadiah Cartive Fuel Card.",
};

const steps = [
  {
    number: "01",
    title: "Buka Fuel Card",
    description: "Pindai QR pada botol atau buka Fuel Card Cartive. Masuk dengan nomor WhatsApp dan persetujuan privasi.",
  },
  {
    number: "02",
    title: "Kirim klaim pembelian",
    description: "Pilih platform, masukkan ID pesanan, jumlah botol Cartive, lalu unggah foto struk yang jelas. Satu pesanan hanya dapat diklaim sekali.",
  },
  {
    number: "03",
    title: "Tunggu pemeriksaan",
    description: "Admin memeriksa klaim secara manual. Stamp masuk ke saldo setelah klaim disetujui; status dan alasan penolakan dapat dilihat di riwayat.",
  },
  {
    number: "04",
    title: "Tukar hadiah",
    description: "Verifikasi nomor WhatsApp terlebih dahulu. Tukar 3 stamp untuk voucher Rp2.000 atau 7 stamp untuk satu botol gratis. Stamp langsung dipotong saat kode diterbitkan.",
  },
  {
    number: "05",
    title: "Gunakan hadiah saat memesan",
    description: "Di checkout web, pilih reward milikmu yang masih tersedia. Untuk pesanan manual, sampaikan kode kepada admin melalui WhatsApp agar diperiksa dan diterapkan.",
  },
];

export default function CaraKerjaPage() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Cartive, ke beranda">
          <span className="wordmark-mark">c.</span>
          <span>cartive</span>
        </Link>
        <Link className="header-cta" href="/kartu">Fuel Card</Link>
      </header>
      <section className="info-page section-wrap">
        <Link className="back-link" href="/">← Kembali ke Cartive</Link>
        <p className="eyebrow"><span className="eyebrow-dot" /> PANDUAN PELANGGAN</p>
        <h1>Scan. Klaim. <em>Nikmati.</em></h1>
        <p className="info-page-lead">
          Fuel Card mencatat stamp dari pembelian Cartive di platform maupun pesanan manual.
          Berikut alur klaim sampai hadiah bisa dipakai.
        </p>
        <ol className="info-steps">
          {steps.map((step) => (
            <li key={step.number}>
              <span className="info-step-number">{step.number}</span>
              <div><h2>{step.title}</h2><p>{step.description}</p></div>
            </li>
          ))}
        </ol>
        <aside className="info-callout">
          Stamp kedaluwarsa setelah 90 hari tanpa aktivitas. Kode hadiah saat ini tidak memiliki tanggal kedaluwarsa.
        </aside>
        <div className="info-page-actions">
          <Link className="button button-primary" href="/kartu">Buka Fuel Card ↗</Link>
          <Link className="text-link" href="/syarat">Baca syarat program</Link>
        </div>
      </section>
      <footer className="site-footer">
        <div className="footer-bottom section-wrap">
          <Link href="/">← Cartive</Link>
          <Link href="/privasi">Kebijakan Privasi</Link>
        </div>
      </footer>
    </main>
  );
}
