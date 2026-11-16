import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Syarat Program Fuel Card — Cartive",
  description: "Ketentuan penggunaan Cartive Fuel Card dan program stamp.",
};

export default function SyaratPage() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Cartive, ke beranda">
          <span className="wordmark-mark">c.</span>
          <span>cartive</span>
        </Link>
        <Link className="header-cta" href="/kartu">Fuel Card</Link>
      </header>
      <article className="info-page terms-page section-wrap">
        <Link className="back-link" href="/">← Kembali ke Cartive</Link>
        <p className="eyebrow"><span className="eyebrow-dot" /> PROGRAM LOYALTY</p>
        <h1>Syarat Fuel <em>Card.</em></h1>
        <p className="info-page-lead">Draf ketentuan penggunaan program stamp Cartive.</p>
        <div className="privacy-draft" role="note">
          Ketentuan ini masih perlu ditinjau Cartive dan penasihat hukum sebelum program dibuka untuk umum.
        </div>
        <section>
          <h2>Keanggotaan dan klaim</h2>
          <ul>
            <li>Fuel Card menggunakan nomor WhatsApp anggota sebagai identitas akun. Anggota bertanggung jawab menjaga akses ke nomor tersebut.</li>
            <li>Setiap botol Cartive yang terlihat pada struk yang sah dapat memperoleh satu stamp setelah klaim disetujui admin.</li>
            <li>Masukkan ID pesanan dan jumlah botol dengan benar. Maksimal lima klaim per anggota setiap hari; satu ID pesanan pada platform yang sama hanya dapat diklaim satu kali.</li>
            <li>Cartive dapat meminta klarifikasi atau menolak klaim apabila bukti tidak terbaca, tidak cocok, duplikat, atau diduga tidak sah. Keputusan dan alasan dicatat dalam riwayat klaim.</li>
            <li>Stamp yang belum digunakan kedaluwarsa setelah 90 hari tanpa aktivitas anggota.</li>
          </ul>
        </section>
        <section>
          <h2>Penukaran hadiah</h2>
          <ul>
            <li>Tiga stamp dapat ditukar dengan satu voucher Rp2.000; tujuh stamp dapat ditukar dengan satu botol gratis.</li>
            <li>Nomor WhatsApp harus diverifikasi sebelum penukaran. Stamp langsung dipotong ketika kode reward diterbitkan.</li>
            <li>Kode reward berlaku tujuh hari sejak diterbitkan dan hanya dapat digunakan satu kali. Pada checkout web, anggota dapat memilih reward miliknya yang masih tersedia; pesanan manual memerlukan pemeriksaan admin melalui WhatsApp.</li>
            <li>Voucher Rp2.000 mengurangi total belanja paling banyak sebesar Rp2.000. Reward botol gratis hanya membebaskan harga satu botol varian yang dipilih; ongkir dan produk lain tetap dibayar.</li>
            <li>Reward ditandai terpakai ketika checkout web berhasil dibuat atau ketika admin mengonfirmasi penerapannya pada pesanan manual. Jika pesanan web dibatalkan sebelum pembayaran, reward dikembalikan ke status tersedia.</li>
          </ul>
        </section>
        <section>
          <h2>Perilaku dan perubahan program</h2>
          <ul>
            <li>Program tidak dapat digabungkan dengan cara yang bertentangan dengan ketentuan reward atau instruksi admin.</li>
            <li>Cartive dapat membatalkan stamp atau kode yang terbukti diperoleh melalui penyalahgunaan, setelah pemeriksaan dan pencatatan alasan.</li>
            <li>Cartive dapat memperbarui program dengan pemberitahuan yang wajar. Perubahan tidak menghapus hak data pribadi yang diatur dalam Kebijakan Privasi.</li>
          </ul>
        </section>
        <section>
          <h2>Hubungan dengan platform</h2>
          <p>
            Cartive adalah program yang dikelola secara independen dan tidak berafiliasi dengan,
            disponsori, atau didukung oleh GoFood, GrabFood, maupun ShopeeFood. Nama platform hanya
            digunakan untuk menjelaskan sumber pembelian.
          </p>
        </section>
        <p className="terms-updated">Draf terakhir diperbarui 14 November 2026.</p>
        <div className="info-page-actions">
          <Link className="button button-primary" href="/kartu">Buka Fuel Card ↗</Link>
          <Link className="text-link" href="/privasi">Kebijakan Privasi</Link>
        </div>
      </article>
      <footer className="site-footer">
        <div className="footer-bottom section-wrap">
          <Link href="/">← Cartive</Link>
          <Link href="/cara-kerja">Cara kerja</Link>
        </div>
      </footer>
    </main>
  );
}
