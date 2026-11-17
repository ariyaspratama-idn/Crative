# Cartive Web

Website Cartive dengan Next.js App Router, TypeScript, Prisma, dan MySQL/TiDB.

## Status saat ini

Website mencakup beranda, katalog enam varian, detail produk, keranjang, checkout, dan permintaan pesanan manual via WhatsApp. Checkout web memerlukan sesi Fuel Card; pesanan, stok batch, harga produk, dan bukti pembayaran disimpan melalui API dan database. Login Fuel Card hanya menerbitkan sesi setelah OTP WhatsApp tervalidasi. Klaim mencatat waktu pesanan WIB dan menegakkan batas 48 jam; semua klaim tetap menunggu pemeriksaan manual. Fuel Card menyediakan riwayat klaim, ledger stamp, dan reward yang kedaluwarsa setelah tujuh hari. Halaman pelanggan meliputi [panduan cara kerja](./src/app/cara-kerja/page.tsx), [syarat Fuel Card](./src/app/syarat/page.tsx), [profil](./src/app/profil/page.tsx), dan [kebijakan privasi](./src/app/privasi/page.tsx). Panel admin mendukung review klaim, verifikasi nomor, penandaan kode reward terpakai, audit, antrean permintaan data, pesanan web, pengelolaan harga/ketersediaan produk, dan pencatatan stok batch.

Pesanan antar menunggu admin menetapkan ongkir sebelum pembayaran. Pembayaran QRIS dan pemeriksaan bukti secara manual hanya dapat digunakan setelah gambar QRIS resmi dikonfigurasi melalui `PAYMENT_QRIS_IMAGE_URL`; jangan gunakan QR contoh. Stok awal juga harus dicatat admin sebagai batch aktif sebelum checkout dapat menerima pesanan. Reward Fuel Card tersedia sebagai voucher Rp2.000 atau botol gratis di checkout. Batas global pesanan web adalah 20 per hari menurut waktu Asia/Jakarta secara default; dapat diubah lewat `DAILY_WEB_ORDER_LIMIT`. PWA menyediakan halaman offline sederhana tanpa menyimpan data akun atau transaksi. Admin dapat mengunduh ekspor CSV pesanan yang mencakup maksimal 5.000 baris per permintaan dan tidak memuat nomor WhatsApp atau alamat pelanggan. Permintaan akses, perbaikan, atau penghapusan data masuk ke antrean admin; penghapusan menganonimkan anggota setelah admin menyelesaikan permintaan, tanpa menghapus riwayat pesanan dan ledger.

## Menjalankan lokal

Kamu memakai Windows Command Prompt (`cmd`), jadi gunakan `copy` (bukan perintah PowerShell `Copy-Item`). Jalankan perintah berikut dari folder `cartive-web`. Jika `.env` sudah ada, jangan menimpanya; pastikan `DATABASE_URL` dan `SESSION_SECRET` sudah diatur.

```cmd
if not exist .env copy .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Contoh `.env.example` memakai MySQL lokal `127.0.0.1:3306` dan kredensial pengembangan. Ganti `SESSION_SECRET` dengan nilai acak minimal 32 karakter sebelum dipakai. Prisma sekarang membaca `.env` secara langsung; karena itu `npm run db:generate` dan perintah Prisma lain akan menemukan `DATABASE_URL`. Perintah migrasi memerlukan service MySQL sudah aktif—pastikan `docker compose up -d` berhasil lebih dahulu. Buka [http://localhost:3000](http://localhost:3000). Penyimpanan objek kompatibel S3 untuk struk lokal memakai SeaweedFS pada `http://localhost:9000`.

Di mode `npm run dev`, server hanya terikat ke loopback IPv6 (`::1`); buka `http://localhost:3000` agar koneksi halaman dan WebSocket development memakai host yang sama. Pada localhost, OTP simulasi ditampilkan di halaman dan admin lokal dapat dibuka tanpa Cloudflare Access; keduanya hanya aktif saat `NODE_ENV=development` dan permintaan host-nya loopback. Pesanan manual tanpa nomor WhatsApp menampilkan draf yang dapat disalin, tetapi tidak mengirim pesan atau membuat order. Mode lokal ini hanya untuk pengujian: jangan expose server ke jaringan, jangan gunakan kode simulasi di production, dan jangan anggap simulasi OTP/order sebagai verifikasi atau transaksi nyata.

Jika Docker belum terpasang atau tidak berjalan, MySQL tidak akan tersedia dan `npm run db:migrate` akan gagal terhubung. Kamu tetap dapat menjalankan `npm run db:generate` setelah `.env` dibuat, tetapi fitur yang memakai database belum bisa digunakan.

Jika `npm run db:generate` dijalankan saat server pengembangan masih aktif, hentikan server dengan `Ctrl+C` lalu jalankan ulang `npm run dev` agar proses memuat Prisma Client terbaru. Gunakan `npm run dev` untuk pengembangan lokal dengan MySQL tanpa TLS; proses produksi mewajibkan koneksi database TLS terverifikasi sehingga `.env.example` lokal tidak dapat dipakai untuk `npm run start`.

## Staging sementara di Vercel

Vercel adalah lingkungan uji sementara; target produksi jangka panjang tetap server pribadi/Coolify. Buat proyek Vercel terpisah dari produksi dan gunakan database TiDB Cloud khusus staging yang kosong atau berisi data sintetis. Jangan menyalin nomor pelanggan, foto struk, pesanan, atau kunci dari produksi. Deployment staging publik tetap bukan lingkungan yang aman untuk data nyata.

1. Hubungkan repositori proyek ini ke Vercel dengan root directory `cartive-web`; gunakan build command `npm run build`. Build membuat Prisma Client, tetapi sengaja **tidak** menjalankan migrasi otomatis.
2. Atur variabel staging pada environment Vercel yang benar: `CARTIVE_DEPLOYMENT_ENV=staging`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, dan `DB_DATABASE` dari TiDB Cloud, `DB_CONNECTION_LIMIT=1`, `SESSION_SECRET` acak tersendiri, `NEXT_PUBLIC_SITE_URL` berupa origin Vercel stabil (`https://<nama-proyek>.vercel.app`), dan `CRON_SECRET` acak tersendiri. Aplikasi menyusun koneksi dari lima variabel `DB_*` tersebut dan mengutamakannya bila lengkap; alternatifnya, gunakan satu `DATABASE_URL` berformat MySQL. Koneksi production/Vercel memakai TLS terverifikasi. Jalankan `npm run db:migrate` secara terencana terhadap database staging sebelum rilis yang memakai migrasi baru; jangan arahkan koneksi ke database produksi.
3. Pertahankan penyimpanan S3-compatible privat dengan `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, dan `S3_SECRET_KEY` dari object storage yang dapat dijangkau Vercel melalui HTTPS. SeaweedFS `localhost` pada komputer pengembangan tidak dapat dijangkau Vercel. **Cloudinary hanya untuk gambar katalog publik**, bukan foto struk atau bukti pembayaran. Tanpa object storage privat eksternal, unggah klaim dan bukti pembayaran memang akan ditolak dengan aman.
4. Login dan klaim di deployment Vercel memerlukan konfigurasi WhatsApp Cloud API serta Turnstile untuk origin yang sesuai. Turnstile dan WhatsApp tidak memiliki bypass development pada deployment; tanpa kredensialnya, alur terkait tetap tertutup, bukan disimulasikan.
5. Untuk Cloudinary, isi hanya `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`. Konfigurasi ini membolehkan optimasi gambar dari cloud tersebut; aset produk yang sekarang masih berupa ilustrasi antarmuka lokal dan belum otomatis diunggah.
6. Untuk Telegram, isi `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_ADMIN_CHAT_ID` dengan tujuan chat admin privat. Pesan hanya berisi alert klaim/pesanan/bukti baru dan label `[STAGING]`; nomor WhatsApp, alamat, order ID platform, dan isi foto tidak dikirim.
7. Untuk OneSignal, buat aplikasi Web Push untuk **origin staging yang stabil** dan atur `NEXT_PUBLIC_ONESIGNAL_APP_ID` serta `ONESIGNAL_REST_API_KEY` (server-only). Browser memuat SDK hanya setelah pelanggan Fuel Card memilih mengaktifkan push; isi notifikasi dibatasi pada status pesanan dan stamp, dan pelanggan dapat mematikannya kembali. Permintaan penghapusan akun menghapus data pengguna OneSignal dahulu; jika penyedia gagal, permintaan tetap terbuka untuk dicoba ulang. Promosi push tidak diaktifkan. Origin server pribadi kelak memerlukan aplikasi OneSignal terpisah. Worker OneSignal berada di subfolder agar tidak mengganti service worker PWA.
8. Brevo tidak diaktifkan: login tetap memakai WhatsApp dan aplikasi belum meminta alamat email. Admin staging tetap dilindungi validasi Cloudflare Access; URL staging yang publik tidak berarti panel admin menjadi terbuka.

`robots.txt` dan metadata memasang `noindex` pada deployment `CARTIVE_DEPLOYMENT_ENV=staging` atau Vercel Preview. `vercel.json` menjalankan maintenance sekali sehari UTC hanya pada deployment Vercel Production; preview tidak menjalankan cron terjadwal. Jadwal itu harus tetap mengarah ke database uji sampai konfigurasi produksi benar-benar dibuat. Saat pindah ke server pribadi, pertahankan MySQL/TiDB, S3-compatible privat, dan worker/cron server; set environment production baru, jangan menyalin rahasia staging.

### Integrasi opsional

- **Telegram:** alert operasional admin; aplikasi tidak mengirim pesan langsung kepada pelanggan.
- **OneSignal:** push status pesanan/loyalty setelah opt-in browser yang terpisah; tidak ada prompt otomatis atau push promosi.
- **Cloudinary:** optimasi aset katalog publik saja; struk dan bukti pembayaran selalu melalui penyimpanan S3-compatible privat.
- **Brevo:** belum dipakai sesuai keputusan saat ini; OTP tetap melalui WhatsApp Cloud API.

Isi `CARTIVE_WHATSAPP_NUMBER` dengan nomor resmi Cartive berformat internasional tanpa tanda `+`. Untuk TiDB Cloud atau deployment produksi, gunakan URL `mysql://.../cartive?sslaccept=strict` dan atur `DB_CONNECTION_LIMIT`. Set `CRON_SECRET` minimal 32 karakter sebelum mengaktifkan cron retensi. Jangan memasukkan kredensial deployment ke repositori atau chat.

Login Fuel Card production mengirim OTP sekali pakai melalui WhatsApp Cloud API. Isi `WHATSAPP_CLOUD_PHONE_NUMBER_ID`, `WHATSAPP_CLOUD_ACCESS_TOKEN`, `WHATSAPP_CLOUD_API_VERSION` (format `vN.N`), `WHATSAPP_LOGIN_TEMPLATE_NAME`, dan bahasa template yang sudah disetujui WhatsApp. Template harus memiliki satu parameter teks pada body untuk kode OTP. Tanpa konfigurasi provider tersebut, login production ditolak dengan aman dan tidak membuat sesi. Kode berlaku 10 menit, dibatasi lima percobaan per kode, dan sesi lama yang tidak memiliki bukti OTP tidak lagi diterima.

Form permintaan kode login dan klaim memakai Cloudflare Turnstile dengan verifikasi token di server serta honeypot. Buat widget untuk domain staging/production di Cloudflare, lalu sediakan `NEXT_PUBLIC_TURNSTILE_SITE_KEY` saat build dan `TURNSTILE_SECRET_KEY` sebagai rahasia runtime deployment. Site key bersifat publik; secret key hanya di server dan tidak boleh diawali `NEXT_PUBLIC_`. Production menolak permintaan bila secret belum tersedia, token tidak valid, atau Siteverify tidak dapat dihubungi. Turnstile sengaja dilewati hanya pada lingkungan non-production agar pengembangan lokal tetap bisa digunakan.

Reward baru menggunakan kode enam karakter yang menghindari huruf/angka mirip dan berlaku tujuh hari. Migrasi memberi reward AVAILABLE lama tanpa tanggal kedaluwarsa masa transisi tujuh hari sejak migrasi; reward 16 karakter lama tetap dapat divalidasi selama masa itu. Fingerprint struk didaftarkan secara atomik agar pengiriman serentak tidak dapat memakai foto yang sama; klaim yang ditolak melepaskan ID pesanan serta reservasi fingerprint agar pelanggan dapat mengirim ulang.

Admin production memvalidasi JWT Cloudflare Access dan allowlist email, tetapi persyaratan MFA dikelola di kebijakan Cloudflare, bukan oleh aplikasi. Sebelum membuka admin, wajibkan MFA pada policy yang mencakup `/admin` dan seluruh `/api/v1/admin/*`, lalu uji token dan penolakan akses tanpa MFA. Jangan menganggap konfigurasi tersebut sudah aktif hanya karena variabel `.env` terisi. Akses admin lokal development yang melewati Cloudflare Access hanya berjalan di loopback dan tidak tersedia dalam build production.

Admin dapat mengubah harga dan mengaktifkan/nonaktifkan produk dari bagian katalog. Harga baru berlaku untuk pesanan berikutnya; harga pesanan yang telah dibuat tidak berubah. Produk nonaktif tidak dapat dipesan, tetapi stok batch dan riwayatnya tetap dipertahankan. Semua perubahan katalog masuk audit log. Tetapkan `NEXT_PUBLIC_SITE_URL` ke URL publik HTTPS Cartive sebelum produksi agar `robots.txt`, `sitemap.xml`, dan URL metadata menggunakan host yang benar.

## Halaman utama

| URL | Fungsi |
| --- | --- |
| `/` | Beranda, menu, Fuel Card, dan pengenalan produk |
| `/menu` | Katalog enam varian, filter Reka/Sela, info ketersediaan batch, dan tautan ke detail produk |
| `/menu/[slug]` | Detail varian, tambah ke keranjang, dan tautan ke formulir pesanan manual |
| `/keranjang` | Keranjang belanja sementara di browser |
| `/checkout` | Checkout ambil sendiri atau antar untuk pengguna Fuel Card |
| `/pesanan` | Riwayat dan status pesanan web |
| `/pesanan/[code]` | Status pesanan dan unggah bukti pembayaran |
| `/cara-kerja` | Panduan Fuel Card dan penukaran reward |
| `/pesan` | Arahkan ke katalog `/menu` untuk memilih produk dan menambahkannya ke keranjang |
| `/kartu` | Login, klaim, saldo stamp, reward, dan riwayat |
| `/profil` | Persetujuan promosi serta permintaan akses/perbaikan/penghapusan data |
| `/syarat` | Draf syarat program Fuel Card |
| `/privasi` | Draf kebijakan privasi |
| `/admin` | Panel privat untuk admin berotorisasi Cloudflare Access, termasuk pesanan dan batch stok |
| `/robots.txt` | Aturan crawler dan tautan sitemap publik |
| `/sitemap.xml` | Sitemap halaman publik berdasarkan `NEXT_PUBLIC_SITE_URL` |

## Pemeriksaan

```bash
npm run lint
npm test
npm run build
```

## Batasan dan kesiapan produksi

Lulus tes, lint, pemeriksaan TypeScript, dan build lokal tidak sama dengan penerimaan produksi. Sebelum membuka layanan, selesaikan dan buktikan checklist ini:

- [ ] Tetapkan domain HTTPS resmi dan `NEXT_PUBLIC_SITE_URL`; verifikasi Cloudflare Tunnel dan bahwa `robots.txt`/sitemap hanya mengiklankan URL Cartive yang benar.
- [ ] Buat Cloudflare Turnstile site/secret keys untuk domain yang tepat. Uji widget login dan klaim, token kedaluwarsa/salah, serta penolakan ketika layanan verifikasi tidak tersedia.
- [ ] Isi kredensial WhatsApp Cloud API dan template OTP yang disetujui; uji pengiriman/penerimaan OTP dari perangkat nyata. Tautan WhatsApp pesanan manual tidak mengirim pesan dari server.
- [ ] Verifikasi pola order ID dengan contoh aktual tiap platform serta tinjau T&C platform untuk QR, klaim loyalitas, dan promosi.
- [ ] Siapkan database MySQL/TiDB produksi dengan TLS terverifikasi, jalankan migrasi pada staging, dan uji batas/isolasi akses serta ekspor data.
- [ ] Siapkan object storage privat, validasi unggah dan hapus struk, lalu buktikan cron maintenance berjalan terjadwal dengan `CRON_SECRET`; jadwal di `vercel.json` hanya berlaku bila deployment memang memakai Vercel Cron.
- [ ] Siapkan backup database dan object storage ke lokasi off-site, lalu lakukan uji restore sebelum go-live dan sesuai jadwal operasional.
- [ ] Wajibkan MFA di Cloudflare Access untuk `/admin` dan seluruh `/api/v1/admin/*`; uji akses admin sah serta penolakan tanpa token/MFA.
- [ ] Konfigurasikan QRIS resmi, ongkir, radius/area layanan, harga, stok awal, dan nomor WhatsApp resmi. Nilai-nilai bisnis ini sengaja tidak ditebak.
- [ ] Uji seluruh perjalanan pelanggan/admin di staging, termasuk stok habis, klaim duplikat/ditolak, bayar, reward, retensi, permintaan data, dan kegagalan layanan eksternal.
- [ ] Jalankan UAT 5–10 pelanggan, Lighthouse mobile, pemeriksaan aksesibilitas dan matriks perangkat/browser sesuai ambang di dokumen pembangunan; catat hasil, pemilik tindak lanjut, dan keputusan rilis.
- [ ] Tinjau syarat/privasi serta validasi resep, HPP, masa simpan, label, izin usaha/pangan, dan kepatuhan pajak dengan pihak yang berwenang.

Integrasi WhatsApp Cloud dan Cloudflare Access sudah memiliki titik integrasi aplikasi, tetapi memerlukan kredensial/policy milik pemilik. Pembayaran MVP mengikuti dokumen: QRIS statis dengan pemeriksaan manual, bukan payment gateway. Dokumen menempatkan API platform merchant, OCR, dan otomatisasi pembayaran sebagai tahap bersyarat/lanjutan; jangan mengaktifkannya tanpa akses resmi, kelayakan merchant, serta keputusan bisnis. Implementasi klaim sekarang selalu menunggu review manual.
