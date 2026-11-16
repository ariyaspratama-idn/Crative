import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — Cartive",
  description: "Informasi penggunaan data pada Fuel Card Cartive.",
};

export default function PrivasiPage() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Cartive, ke beranda">
          <span className="wordmark-mark">c.</span>
          <span>cartive</span>
        </Link>
        <Link className="header-cta" href="/kartu">Fuel Card</Link>
      </header>
      <article className="privacy-page section-wrap">
        <Link className="back-link" href="/kartu">← Kembali ke Fuel Card</Link>
        <p className="eyebrow">CARTIVE · PRIVASI</p>
        <h1>Kebijakan <em>Privasi.</em></h1>
        <p className="privacy-updated">Draf untuk MVP awal · Terakhir ditinjau 15 November 2026</p>
        <div className="privacy-draft" role="note">
          Website masih dalam tahap pengembangan. Kebijakan ini perlu dilengkapi dan ditinjau sebelum program dibuka untuk umum.
        </div>
        <section>
          <h2>Data yang digunakan</h2>
          <p>Fuel Card menggunakan nomor WhatsApp sebagai identitas anggota, pilihan persetujuan promosi, riwayat klaim, status verifikasi, dan foto struk yang kamu kirim. Login memerlukan kode sekali pakai yang dikirim ke nomor tersebut; hash tantangan disimpan sementara dan kode berlaku 10 menit. Jika menggunakan checkout web, Cartive juga menyimpan produk dan jumlah pesanan, metode penerimaan, alamat hanya untuk pengantaran, catatan opsional, status pesanan, serta foto bukti pembayaran. Nama pelanggan tidak diminta pada checkout web. Foto struk atau bukti pembayaran dapat memuat data pribadi yang tercetak.</p>
        </section>
        <section>
          <h2>Tujuan pemrosesan</h2>
          <p>Data digunakan untuk membuat Fuel Card, memeriksa klaim stamp, memproses dan mengelola pesanan, mengonfirmasi pembayaran, menjaga keamanan layanan, dan mengirim promosi hanya jika kamu memberi persetujuan terpisah.</p>
        </section>
        <section>
          <h2>Pesanan manual melalui WhatsApp</h2>
          <p>Formulir pesan menyiapkan teks pesanan dan membuka WhatsApp; Cartive belum menyimpan pesanan manual atau alamat ke basis data website. Jika kamu melanjutkan, nama, produk, metode penerimaan, alamat pengiriman, dan catatan yang diisi akan dikirim ke WhatsApp Cartive. Bukti pembayaran dikirim sendiri sebagai lampiran di chat setelah admin mengonfirmasi ketersediaan dan ongkir. Pemrosesan dan penyimpanan di WhatsApp mengikuti layanan serta kebijakan WhatsApp.</p>
        </section>
        <section>
          <h2>Penyimpanan dan keamanan</h2>
          <p>Nomor WhatsApp, riwayat klaim, pesanan, dan kode reward disimpan untuk menjalankan layanan. Kode reward berlaku tujuh hari dan stamp langsung dipotong ketika kode diterbitkan. Foto struk Fuel Card dijadwalkan dihapus 30 hari setelah klaim selesai; bukti pembayaran pesanan web dijadwalkan dihapus 30 hari setelah pesanan selesai atau dibatalkan. Tugas retensi juga menghapus log audit setelah 365 hari, tantangan login kedaluwarsa, dan memproses kedaluwarsa stamp setelah 90 hari tanpa aktivitas. Penghapusan otomatis memerlukan database, penyimpanan, dan jadwal tugas yang terkonfigurasi serta perlu diverifikasi di lingkungan produksi. Jangan kirim bukti pembayaran atau alamat ke chat sebelum memastikan akun WhatsApp Cartive resmi.</p>
        </section>
        <section>
          <h2>Persetujuan promosi</h2>
          <p>Persetujuan menerima promosi bersifat opsional, terpisah, dan tidak dicentang otomatis. Persetujuan dapat ditarik kapan saja melalui halaman <Link href="/profil">Profil</Link>; penarikan tidak memengaruhi stamp atau layanan Fuel Card.</p>
        </section>
        <section>
          <h2>Notifikasi push</h2>
          <p>Jika kamu memilih mengaktifkan notifikasi push di Fuel Card, browser mengirim subscription push ke OneSignal dan Cartive menautkannya dengan ID akun internal berpseudonim yang tidak memuat nomor WhatsApp. Push hanya digunakan untuk status pesanan dan pembaruan stamp, bukan promosi. Persetujuan push dapat dimatikan kapan saja melalui Fuel Card atau pengaturan izin situs di browser. Jika permintaan penghapusan akun disetujui, data pengguna OneSignal dihapus sebelum data akun Cartive dianonimkan.</p>
        </section>
        <section>
          <h2>Hak dan kontak</h2>
          <p>Kamu dapat meminta akses, perbaikan, atau penghapusan data melalui halaman <Link href="/profil">Profil</Link>. Permintaan terikat pada akun yang sedang masuk dan ditinjau admin; pengajuan penghapusan tidak otomatis menghapus data. Kebijakan dan saluran kontak ini masih berupa draf yang perlu dilengkapi dan ditinjau sebelum layanan dibuka.</p>
        </section>
        <section>
          <h2>Penyedia layanan</h2>
          <p>Website menggunakan penyedia hosting dan basis data; Cloudflare untuk perlindungan akses; OneSignal hanya bagi pelanggan yang secara terpisah mengaktifkan push; serta penyimpanan object privat untuk foto struk dan bukti pembayaran. Cloudinary hanya melayani aset gambar katalog publik. Telegram menerima alert operasional admin tanpa data pribadi pelanggan. Login tetap menggunakan WhatsApp; Brevo dan email pelanggan tidak digunakan. Lingkungan staging dapat memakai Vercel, TiDB Cloud, dan penyedia storage yang dikonfigurasi. Daftar penyedia final, lokasi pemrosesan, kontak Cartive, dan masa retensi lengkap perlu dipastikan sebelum go-live.</p>
        </section>
      </article>
      <footer className="site-footer">
        <div className="footer-bottom section-wrap">
          <Link href="/">← Cartive</Link>
          <div className="footer-legal-links">
            <Link href="/syarat">Syarat Fuel Card</Link>
            <Link href="/cara-kerja">Cara kerja</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
