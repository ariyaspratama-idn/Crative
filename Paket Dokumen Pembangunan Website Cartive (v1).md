# Paket Dokumen Pembangunan Website Cartive

*Versi 1.0 (draft) · 23 Oktober 2026 · melengkapi Dokumen Master Cartive v2*

> **Cara membaca:** bahasa dibuat sederhana dan istilah teknis dijelaskan di Glosarium (bagian terakhir). Label fase: **MVP-1** = wajib untuk go-live pertama (loyalty), **MVP-2** = toko langsung di web, **Nanti** = setelah ada data nyata.

## 0. Indeks Dokumen

Daftar ini mengikuti checklist dokumen PM yang biasa dipakai di Wave Projects Center, disesuaikan untuk produk sendiri.

| No | Dokumen | Bagian |
| --- | --- | --- |
| 1 | Project Brief | 1 |
| 2 | Riset Kompetitor & Referensi UI | 2 |
| 3 | User Persona | 3 |
| 4 | PRD | 4 |
| 5 | User Stories & Acceptance Criteria | 5 |
| 6 | SRS (spesifikasi kebutuhan) | 6 |
| 7 | Sitemap & User Flow | 7 |
| 8 | Wireframe, Mockup Spec & Design System | 8 |
| 9 | Arsitektur & Tech Stack | 9 |
| 10 | ERD & Data Dictionary | 10 |
| 11 | API Spec | 11 |
| 12 | Keamanan, Kepatuhan & Privacy Policy | 12 |
| 13 | Deploy Plan | 13 |
| 14 | Breakdown, Estimasi, Timeline, Backlog, Milestone/MVP | 14 |
| 15 | Risk Register | 15 |
| 16 | Test Plan, QA & UAT | 16 |
| 17 | SEO, Analytics, Aset & Daftar Dependensi | 17 |
| 18 | README, Panduan, Manual Pengguna, Changelog | 18 |

**Sengaja belum dibuat:** Kontrak, Scope of Work, SLA, dan Handover, karena ini produk sendiri, bukan proyek klien. Dokumen itu baru relevan bila Cartive nanti dikerjakan untuk pihak lain. **Mockup visual high-fidelity** dikerjakan setelah spesifikasi bagian 8 disetujui.

---

## 1. Project Brief

| Item | Isi |
| --- | --- |
| Nama proyek | Website Cartive (loyalty + toko langsung) |
| Tujuan | Mengubah pembeli platform (GoFood, GrabFood, ShopeeFood) menjadi pelanggan yang dikenal dan mau membeli lagi, termasuk lewat web sendiri yang marginnya lebih besar |
| Masalah | Potongan platform 22–33%, tidak ada data pelanggan, tidak ada alasan repeat order |
| Solusi | QR di botol mengarah ke web. Web menjadi Fuel Card (stamp) untuk semua pembelian dan toko langsung |
| Pengguna | Pelanggan (publik), admin/owner (1 orang) |
| Platform | Web responsif mobile-first, bisa dipasang sebagai PWA. Tampil baik di HP, tablet, laptop, dan PC |
| Tim | 1 orang (developer sekaligus admin). Jadwal kerja tidak tetap, jadi rencana memakai milestone, bukan tanggal kaku |
| Hosting | Vercel + TiDB Cloud untuk staging sementara; server sendiri (Coolify + Cloudflare Tunnel) sebagai target produksi |
| Indikator sukses (hipotesis) | 10–20% botol platform diklaim dalam 30 hari. Sebagian besar pelanggan yang klaim kembali dalam 30 hari. 20% penjualan lewat web dalam 3 bulan. Angka ini target awal, bukan angka industri |
| Batasan | Anggaran layanan eksternal belum ditetapkan; OTP menggunakan WhatsApp Cloud API; tanpa integrasi API platform |
| Asumsi utama | Aturan platform mengizinkan program loyalty lewat QR (belum diverifikasi). Struk platform memuat order ID, nama merchant, item, dan waktu |

---

## 2. Riset Kompetitor & Referensi UI

Delapan gambar referensi sudah dianalisis. Hasilnya:

| Referensi | Yang diambil | Yang tidak dipakai |
| --- | --- | --- |
| **Coffee Now** (aplikasi pesan kopi) | Mode terang dan gelap, navigasi bawah, beranda dengan banner promo + rekomendasi, alur lengkap keranjang → checkout → pesanan diterima → pelacakan | Login Google/Facebook (Cartive memakai nomor WA), alamat wajib di awal |
| **Brew Bliss** | Kartu poin dengan progress bar ke reward, kategori berikon bulat, bottom sheet kustomisasi, stepper status 4 tahap (Confirmed → Preparing → On the way → Delivered), kombinasi huruf serif dan sans | Peta pelacakan langsung (kurir manual, cukup stepper) |
| **CupfulCanvas** | Pilihan ambil sendiri atau antar, ringkasan review sebelum bayar, palet krem-coklat hangat | Pemilihan banyak cafe |
| **Cup “Scan, Return & Earn”** | Ajakan 3 kata bertipografi besar + QR besar + panah penunjuk | Konsep pengembalian cup |
| **Botol Cold White, Mula Kopi, ECRU, Tanatap** | Label gelap/earth tone minimalis, nama varian besar, volume, “keep refrigerated”, “best before”, daftar isi botol, segel “open seal enjoy coffee”, “shake before drink”, botol pipih | Foto gaya hidup dipakai sebagai referensi konten promosi, bukan UI |

**Lima pola yang dipakai ulang:**

1. Navigasi bawah 4–5 ikon di mobile.
2. Kartu loyalty tampil di beranda dengan progres jelas.
3. Kartu produk dua kolom dengan foto besar.
4. Satu aksi utama per layar.
5. Palet coklat–krem–oranye karamel, dengan versi gelap.

> Referensi adalah karya pihak lain. Dipakai sebagai inspirasi struktur dan gaya, bukan untuk disalin visual atau asetnya.

---

## 3. User Persona (hipotesis, divalidasi di Fase 0)

|  | **Raka (24)** | **Dini (29)** | **Pak Yus (38)** |
| --- | --- | --- | --- |
| Profil | Freelancer/programmer, sering lembur | Pekerja kantoran | Mekanik bengkel di sekitar produksi |
| Cara beli | Pesan lewat aplikasi food delivery malam hari | Pesan 2–3 botol untuk rekan | Ambil langsung, bayar QRIS |
| Suka | Reka, kopi pekat, mode gelap | Sela, manis karamel | Harga jelas, tanpa ribet |
| Frustrasi | Proses panjang, wajib buat akun | Tidak tahu untung membeli di mana | Ongkir lebih mahal dari kopi |
| Butuh dari web | Klaim stamp kurang dari 1 menit | Reward yang jelas, paket bundling | Pesan cepat, ambil tanpa ongkir |

---

## 4. PRD (Product Requirements Document)

### 4.1 Tujuan dan non-tujuan

**Tujuan:** (1) pelanggan platform mau klaim stamp, (2) pelanggan kembali membeli, (3) sebagian pindah membeli di web.

**Non-tujuan (tidak dikerjakan sekarang):** aplikasi native Android/iOS, pembayaran otomatis, integrasi API platform, kampanye/broadcast WhatsApp, multi-cabang, program referral. OTP login tetap melalui WhatsApp Cloud API.

### 4.2 Ruang lingkup per fase

| Fase | Isi |
| --- | --- |
| **MVP-1 (Loyalty)** | Landing dari QR, masuk dengan nomor WA, Fuel Card, klaim stamp (order ID + foto struk), riwayat klaim, reward dan penebusan, verifikasi WA, admin review klaim, halaman privasi |
| **MVP-2 (Toko langsung)** | Menu, keranjang, checkout (ambil/antar), pembayaran QRIS statis + bukti bayar, status pesanan, stok per batch, voucher, push status pesanan/stamp melalui OneSignal setelah opt-in |
| **Nanti** | Payment gateway, OCR sebagai pemeriksa silang, notifikasi push promosi, referral, versi bahasa lain |

### 4.3 Daftar fitur

| ID | Fitur | Prioritas | Fase |
| --- | --- | --- | --- |
| F01 | Landing dari QR (parameter sumber untuk analytics) | Must | MVP-1 |
| F02 | Masuk dengan nomor WA tanpa password | Must | MVP-1 |
| F03 | Fuel Card: jumlah stamp, progres, reward | Must | MVP-1 |
| F04 | Klaim stamp platform (order ID + foto struk) | Must | MVP-1 |
| F05 | Validasi klaim otomatis berbasis aturan + antrean review | Must | MVP-1 |
| F06 | Riwayat klaim dan status | Must | MVP-1 |
| F07 | Reward 3 stamp dan 7 stamp, tebus dengan kode | Must | MVP-1 |
| F08 | Verifikasi nomor WA (saat tebus) | Must | MVP-1 |
| F09 | Panel admin: review klaim, anggota, reward | Must | MVP-1 |
| F10 | Persetujuan privasi dan opt-in promosi | Must | MVP-1 |
| F11 | Menu dan detail produk | Must | MVP-2 |
| F12 | Keranjang dan checkout (ambil/antar) | Must | MVP-2 |
| F13 | Pembayaran QRIS statis + unggah bukti | Must | MVP-2 |
| F14 | Status pesanan (stepper) | Must | MVP-2 |
| F15 | Stok per batch dan batas pesanan harian | Should | MVP-2 |
| F16 | Stamp 2× untuk pembelian web | Must | MVP-2 |
| F17 | Mode gelap dan terang | Should | MVP-1 |
| F18 | PWA (bisa dipasang, halaman offline) | Should | MVP-1 |
| F19 | Ekspor data CSV untuk admin | Should | MVP-2 |
| F20 | OCR pemeriksa silang | Could | Nanti |
| F21 | Payment gateway | Could | Nanti |
| F22 | Notifikasi WA otomatis (API resmi) | Could | Nanti |

### 4.4 Aturan bisnis

| ID | Aturan |
| --- | --- |
| BR-01 | Pembelian platform: 1 stamp per botol Cartive di struk |
| BR-02 | Pembelian web: 2 stamp per botol, diberikan setelah pembayaran dikonfirmasi |
| BR-03 | 3 stamp = voucher Rp2.000 untuk order web berikutnya |
| BR-04 | 7 stamp = 1 botol gratis (varian bebas), ditebus di web |
| BR-05 | Stamp hangus 90 hari setelah aktivitas terakhir |
| BR-06 | Klaim struk maksimal 48 jam setelah waktu order, maksimal 5 klaim per nomor per hari |
| BR-07 | Satu pasangan (platform, order ID) hanya bisa diklaim satu kali seumur hidup |
| BR-08 | Penebusan reward wajib nomor WA terverifikasi |
| BR-09 | Stamp dicatat sebagai ledger (kejadian), saldo dihitung dari ledger |
| BR-10 | Promosi lewat WA hanya untuk yang memberi persetujuan |

### 4.5 Kebutuhan non-fungsional

| Aspek | Target |
| --- | --- |
| Performa | LCP ≤ 2,5 detik di 4G, JavaScript awal ≤ 200 KB (gzip), gambar memakai format modern |
| Ketersediaan | Target 99% (server sendiri, tidak dijanjikan SLA ke pelanggan) |
| Browser | Chrome, Safari, Samsung Internet, Firefox, Edge (2 versi terakhir) |
| Aksesibilitas | Dasar WCAG 2.2 AA: kontras, area sentuh ≥ 44 px, label form, navigasi keyboard |
| Bahasa & waktu | Indonesia, zona waktu Asia/Jakarta, siap multi-bahasa |
| Privasi | Sesuai UU PDP No. 27 Tahun 2022 (bagian 12) |

---

## 5. User Stories & Acceptance Criteria

**US-01 Scan dan buka Fuel Card** Sebagai pelanggan, saya ingin membuka web lewat QR agar bisa langsung klaim stamp.

- Diberikan saya memindai QR di botol, ketika halaman terbuka, maka tombol “Klaim stamp” terlihat tanpa scroll dan halaman termuat ≤ 2,5 detik di 4G.
- Saya tidak diminta membuat password.

**US-02 Masuk dengan nomor WA**

- Diberikan saya mengisi 0812-3456-7890, maka sistem menyimpan 6281234567890.
- Diberikan nomor tidak valid, maka tampil “Nomor WhatsApp tidak valid”.
- Nomor baru otomatis membuat Fuel Card. Kotak persetujuan promosi tidak tercentang bawaan.

**US-03 Klaim stamp** Sebagai pelanggan platform, saya ingin mengklaim stamp dari struk agar mendapat reward.

- Saya memilih platform, mengisi order ID, dan mengunggah foto struk (maksimal 5 MB).
- Jika order ID sudah diklaim, tampil “Order ID ini sudah diklaim”.
- Hasil klaim: disetujui otomatis, menunggu review, atau ditolak dengan alasan jelas.

**US-04 Riwayat klaim**

- Setiap klaim tampil dengan tanggal, platform, jumlah stamp, dan lencana status (menunggu, disetujui, ditolak).

**US-05 Tebus reward**

- Diberikan stamp cukup dan nomor sudah terverifikasi, ketika saya menekan Tebus, maka stamp berkurang sesuai aturan dan tampil kode tebus 6 karakter yang berlaku 7 hari.
- Jika belum terverifikasi, saya diarahkan ke langkah verifikasi dulu.

**US-06 Verifikasi nomor WA**

- Saya menekan tombol, WhatsApp terbuka dengan pesan berisi kode (mis. VERIF-4F7K) ke nomor Cartive.
- Setelah admin menandai, status berubah menjadi “Terverifikasi”.

**US-07 Pesan di web (MVP-2)**

- Saya memilih menu, mengatur jumlah, mengisi ambil/antar, membayar, lalu melihat status pesanan.
- Stok habis tidak bisa dipesan. Stamp 2× masuk setelah pembayaran dikonfirmasi.

**US-08 Admin review klaim**

- Antrean menampilkan gambar struk, data yang diisi, dan hasil pemeriksaan aturan.
- Admin menyetujui atau menolak dengan alasan. Setiap tindakan masuk log audit.

**US-09 Admin kelola menu dan stok**

- Admin mengubah harga, status tersedia, dan stok per batch tanpa menyentuh kode.

**US-10 Hak data pelanggan**

- Pelanggan bisa meminta penghapusan data dari halaman profil atau lewat WA. Admin memprosesnya dalam batas waktu yang tercantum di kebijakan privasi.

---

## 6. SRS Ringkas (aturan rinci yang dikodekan)

### 6.1 Normalisasi nomor WA

1. Buang spasi, tanda hubung, dan tanda plus.
2. Awalan 0 diganti 62. Awalan 62 dibiarkan. Awalan 8 ditambah 62.
3. Panjang akhir 10–15 digit. Disimpan sebagai teks, kolom unik.

### 6.2 Unggah struk

| Aturan | Nilai |
| --- | --- |
| Format | JPG, PNG, WEBP, HEIC |
| Ukuran | ≤ 5 MB |
| Proses di server | Cek tipe sebenarnya (bukan hanya ekstensi), ubah ke WEBP maks 1280 px, hapus metadata EXIF, simpan hash gambar |
| Penyimpanan | Bucket privat, tautan bertanda tangan sementara |
| Retensi | Dihapus otomatis 30 hari setelah klaim selesai |

### 6.3 Status klaim

`pending` → (`auto_approved` | `needs_review` | `rejected`). Dari `needs_review`, admin mengubah ke `approved` atau `rejected`. Klaim yang sudah final tidak bisa diubah, hanya dibatalkan lewat entri ledger penyeimbang.

### 6.4 Pemeriksaan otomatis (urutan)

1. Format order ID cocok pola platform (pola diisi dari 10 contoh struk asli per platform).
2. Pasangan (platform, order ID) belum pernah ada.
3. Hash gambar belum pernah dipakai.
4. Batas harian dan rate limit per nomor, perangkat, dan IP.
5. Akun baru yang klaimnya akan mencapai reward ke-7 selalu masuk `needs_review`.

Selama OCR belum ada, hasil pemeriksaan 1–5 yang lolos menjadi `auto_approved` untuk klaim biasa dan sisanya `needs_review`.

### 6.5 Batas laju (rate limit)

- Masuk dengan nomor: 5 percobaan per 10 menit per IP.
- Klaim: 5 per hari per nomor, 10 per hari per IP.
- Unggah gagal berturut-turut 3 kali: tunda 15 menit.

### 6.6 Teks pesan penolakan (bahasa sederhana)

| Alasan | Pesan ke pelanggan |
| --- | --- |
| Order ID duplikat | Order ID ini sudah diklaim. |
| Terlalu lama | Struk melewati batas 48 jam. |
| Format salah | Order ID tidak sesuai format platform yang dipilih. |
| Gambar bermasalah | Foto struk tidak terbaca. Coba foto ulang dengan cahaya cukup. |
| Batas harian | Batas klaim hari ini tercapai. Coba lagi besok. |

---

## 7. Sitemap & User Flow

### 7.1 Sitemap

**Publik**

- `/` Landing (dari QR)
- `/menu` Daftar menu (MVP-2)
- `/menu/[slug]` Detail produk (MVP-2)
- `/keranjang` dan `/checkout` (MVP-2)
- `/pesanan/[kode]` Status pesanan (MVP-2)
- `/kartu` Fuel Card
- `/kartu/klaim` Klaim stamp
- `/kartu/riwayat` Riwayat
- `/hadiah` Reward dan tebus
- `/verifikasi` Verifikasi WA
- `/profil` Pengaturan, persetujuan, hapus data
- `/cara-kerja`, `/privasi`, `/syarat`

**Admin** (`/admin/*`, dilindungi): Dashboard, Klaim, Pesanan, Menu & Stok, Anggota, Reward & Voucher, Pengaturan, Log Audit.

### 7.2 Flow A: Scan sampai stamp

1. Pelanggan memindai QR → landing.
2. Menekan “Klaim stamp” → input nomor WA (+ centang privasi).
3. Fuel Card terbuka → “Tambah stamp”.
4. Pilih platform → isi order ID → unggah struk.
5. Sistem memeriksa aturan. **Lolos:** stamp bertambah. **Ragu:** status “Menunggu review”. **Gagal:** pesan penolakan.
6. Pelanggan melihat jumlah stamp dan progres.

### 7.3 Flow B: Tebus reward

1. Fuel Card menampilkan tombol Tebus saat stamp cukup.
2. Jika nomor belum terverifikasi → alur verifikasi WA → admin menandai.
3. Tebus → kode 6 karakter berlaku 7 hari.
4. Kode dipakai pada order web atau saat ambil botol. Admin menandai kode terpakai.

### 7.4 Flow C: Order di web (MVP-2)

1. Menu → pilih botol → keranjang.
2. Checkout: pilih ambil sendiri atau antar (alamat dan zona ongkir bila antar), kode voucher bila ada.
3. Halaman pembayaran: QRIS statis + nominal + unggah bukti.
4. Admin mengonfirmasi → status “Diproses” → “Siap” → “Selesai”.
5. Stamp 2× masuk otomatis saat status dibayar.

### 7.5 Flow D: Admin review

1. Masuk admin → antrean klaim.
2. Buka klaim → lihat gambar dan hasil pemeriksaan.
3. Setujui atau tolak (alasan wajib). Ledger dan log audit terisi otomatis.

---

## 8. Wireframe, Mockup Spec & Design System

### 8.1 Prinsip desain

1. **Mobile-first:** semua layar dirancang di lebar 360 px dulu, lalu diperluas ke tablet dan desktop.
2. **Satu aksi utama per layar:** tombol terpenting selalu paling menonjol dan berada di jangkauan ibu jari.
3. **Klaim kurang dari 1 menit:** isian dibuat sesedikit mungkin, tanpa password.
4. **Hangat dan jelas:** palet coklat–krem–karamel, teks pendek, istilah sehari-hari.
5. **Terang dan gelap:** mengikuti pengaturan perangkat, bisa diganti manual.

### 8.2 Layout responsif

| Breakpoint | Lebar | Layout |
| --- | --- | --- |
| Mobile | < 640 px | 1 kolom, navigasi bawah 4 ikon, kartu menu 2 kolom, bottom sheet, tombol aksi menempel di bawah |
| Tablet | 640–1023 px | Konten tengah maks 720 px, kartu menu 3 kolom, navigasi atas ringkas, checkout tetap 1 kolom |
| Desktop | ≥ 1024 px | Navigasi atas penuh, kontainer maks 1120 px, kartu menu 4 kolom, Fuel Card menempel di kiri dan konten di kanan, checkout 2 kolom (form kiri, ringkasan menempel di kanan) |
| Layar sangat lebar | ≥ 1440 px | Lebar kontainer tetap 1120 px, sisanya ruang kosong |

Aturan umum: area sentuh ≥ 44 px, efek hover hanya tambahan (tidak dibutuhkan untuk fungsi), tabel lebar boleh digeser horizontal di dalam wadahnya, dan halaman tidak boleh bergeser menyamping.

### 8.3 Design tokens

**Warna**

| Token | Terang | Gelap | Dipakai untuk |
| --- | --- | --- | --- |
| bg | #FBF7F1 | #15100C | Latar halaman |
| surface | #FFFFFF | #1F1812 | Kartu, sheet |
| surface-alt | #F3EBDF | #2A2018 | Blok sekunder |
| ink | #2A1A10 | #F5EDE3 | Teks utama |
| muted | #6F5F52 | #A89A8B | Teks pendukung |
| border | #E6DACB | #3A2D22 | Garis |
| primary | #E07B1F | #F28C28 | Latar tombol utama |
| on-primary | #2A1A10 | #15100C | Teks di atas tombol utama |
| link | #B85E10 | #F6A24F | Tautan dan teks aksen |
| success | #2F7D4F | #5BBF86 | Disetujui, selesai |
| warning | #A66B00 | #E6B34A | Menunggu review |
| danger | #B83A32 | #F0746C | Ditolak, galat |

Catatan kontras: teks gelap di atas tombol karamel ≈ 5,7:1, teks tautan #B85E10 di atas putih ≈ 4,5:1. Karamel terang **tidak** dipakai sebagai warna teks di latar terang.

**Warna lini:** Reka = latar espresso (#2A1A10) teks krem. Sela = latar karamel krim (#D9A066) teks espresso.

**Tipografi**

- Judul: *Fraunces* (serif, bobot 600–700). Isi dan antarmuka: *Plus Jakarta Sans* (400, 500, 700). Dimuat lewat `next/font` agar disajikan dari server sendiri.
- Skala (mobile / desktop): H1 28/40, H2 22/30, H3 18/22, isi 16, kecil 14, keterangan 12. Tinggi baris 1,5 untuk isi dan 1,2 untuk judul. Angka harga memakai tabular numbers.

**Lainnya**

- Jarak: skala 4 px (4, 8, 12, 16, 24, 32, 48).
- Sudut: 12 px (tombol, input), 16 px (kartu), 24 px (bottom sheet), penuh (chip).
- Bayangan: lembut di mode terang, mode gelap memakai garis tepi.
- Gerak: 150–250 ms ease-out, animasi pengisian stamp 400 ms, hormati pengaturan “mengurangi gerakan”.

### 8.4 Komponen

| Komponen | Catatan |
| --- | --- |
| Tombol (utama, sekunder, teks) | Tinggi 48 px mobile, keadaan loading dan nonaktif jelas |
| Input nomor WA | Awalan +62 tetap, mengubah 08… menjadi 62… otomatis, `inputmode=tel` |
| Kartu produk | Foto besar, nama, harga, tombol tambah. Chip lini Reka/Sela |
| **Stamp grid** | 7 lingkaran berikon biji kopi, terisi karamel, animasi saat bertambah |
| Progress bar | Menuju reward, mengikuti pola kartu poin pada referensi |
| Navigasi bawah | Beranda, Menu, Kartu (tengah, menonjol), Pesanan, Profil |
| Bottom sheet | Detail produk, pilih platform, konfirmasi tebus |
| Dropzone unggah | Tombol kamera langsung (`capture`), pratinjau, tombol ganti |
| Stepper status | 4 tahap: Dibayar → Diproses → Siap → Selesai |
| Lencana status | Menunggu (kuning), Disetujui (hijau), Ditolak (merah) |
| Toast, dialog, skeleton, empty state | Teks sederhana dan satu langkah lanjutan |

### 8.5 Wireframe layar utama (mobile)

**Landing (dari QR)**

```
+----------------------------+
| Cartive              (tema)|
+----------------------------+
| SCAN. KLAIM.               |
| ISI ULANG TENAGAMU.        |
| Kumpulkan stamp dari tiap  |
| botol, tukar botol gratis. |
|                            |
| [ Klaim stamp ]  <- utama  |
| [ Lihat menu  ]  <- kedua  |
+----------------------------+
| Cara kerja: 1 Scan         |
|             2 Isi order ID |
|             3 Dapat stamp  |
+----------------------------+
| Beranda Menu KARTU Pesan Profil |
+----------------------------+
```

**Fuel Card**

```
+----------------------------+
| Halo, 0812 **** 7890       |
+----------------------------+
|  o o o o o o o   (7 stamp) |
|  Terisi 4 dari 7           |
|  [=======-----] 3 lagi     |
|  untuk 1 botol gratis      |
+----------------------------+
| [ Tambah stamp ]           |
| Hadiah: Voucher Rp2.000 ok |
|         Botol gratis (3)   |
+----------------------------+
| Riwayat klaim   >          |
+----------------------------+
```

**Klaim stamp**

```
+----------------------------+
| < Klaim stamp              |
| Beli di mana?              |
| (GoFood)(GrabFood)(Shopee) |
| Order ID  [______________] |
| Foto struk [ Ambil foto ]  |
|           (pratinjau)      |
| Maksimal 48 jam dari order |
| [ Kirim klaim ]            |
+----------------------------+
```

**Checkout (MVP-2)**

```
+----------------------------+
| < Checkout                 |
| (Ambil sendiri)(Antar)     |
| Alamat / zona   [_______]  |
| Kode voucher    [_______]  |
| Ringkasan: 3 botol  Rp30rb |
| Ongkir                Rpxx |
| Total                 Rpxx |
| [ Bayar via QRIS ]         |
+----------------------------+
```

**Penyesuaian tablet dan desktop:** Fuel Card menjadi panel kiri yang menempel, riwayat dan hadiah menjadi dua kolom di kanan. Menu menjadi grid 3–4 kolom. Checkout memakai dua kolom dengan ringkasan di kanan. Navigasi bawah berubah menjadi navigasi atas.

### 8.6 Daftar layar

| ID | Layar | Fase | Catatan desain |
| --- | --- | --- | --- |
| S01 | Landing | MVP-1 | Satu CTA utama, parameter `?s=botol` dibaca untuk analytics |
| S02 | Masuk nomor WA | MVP-1 | Satu kolom, persetujuan privasi dan promo terpisah |
| S03 | Fuel Card | MVP-1 | Stamp grid + progres di atas |
| S04 | Klaim stamp | MVP-1 | Pilihan platform berupa chip besar |
| S05 | Hasil klaim dan riwayat | MVP-1 | Lencana status, alasan penolakan jelas |
| S06 | Hadiah dan tebus | MVP-1 | Kode tebus besar, hitung mundur 7 hari |
| S07 | Verifikasi WA | MVP-1 | Tombol buka WhatsApp, instruksi 2 langkah |
| S08 | Profil dan privasi | MVP-1 | Persetujuan, hapus data |
| S09 | Menu dan detail produk | MVP-2 | Tab Reka/Sela, foto besar |
| S10 | Keranjang dan checkout | MVP-2 | Tombol bayar menempel di bawah |
| S11 | Pembayaran QRIS dan unggah bukti | MVP-2 | QR besar, nominal bisa disalin |
| S12 | Status pesanan | MVP-2 | Stepper 4 tahap |
| S13 | Halaman info (cara kerja, privasi, syarat) | MVP-1 | Teks pendek, daftar ringkas |
| A01–A08 | Admin: login, dashboard, klaim, pesanan, menu dan stok, anggota, reward, pengaturan | MVP-1/2 | Tabel responsif, antrean klaim terbuka sebagai layar utama |

### 8.7 Spesifikasi stiker QR dan label botol

Diambil dari referensi cup “Scan, Return & Earn” dan label botol minimalis.

**Stiker QR**

- Ukuran stiker ≈ 4×4 cm, QR minimal 2,5×2,5 cm, hitam di atas putih, ruang kosong di sekeliling QR minimal 4 modul.
- Bahan tahan air dan dingin (vinyl atau stiker berlaminasi). Botol dingin berembun, jadi **uji pindai pada botol basah** sebelum cetak massal.
- Teks: SCAN. KLAIM. ISI ULANG. + “Kumpulkan stamp, tukar botol gratis” + panah ke QR + alamat web pendek di bawah QR sebagai cadangan.
- Tautan QR: `https://[domain]/?s=botol`. QR sama untuk semua botol. Kode batch dicetak sebagai teks di label, bukan di QR.

**Label botol (wajib ada)** Brand, nama varian, volume 250 ml, “Simpan dingin”, tanggal produksi dan “baik dikonsumsi sebelum”, komposisi, alergen (susu, kedelai, gandum), nama dan alamat produsen, nomor izin edar bila sudah ada, “Kocok sebelum diminum”, dan segel keamanan pada tutup (“Segel — buka, nikmati”). Reka berlabel gelap, Sela berlabel karamel krim.

### 8.8 Microcopy (nada santai, singkat)

- Tombol utama: “Klaim stamp”, “Tebus hadiah”, “Kirim klaim”.
- Kosong: “Belum ada stamp. Scan QR di botol, mulai dari satu.”
- Berhasil: “Stamp masuk! 3 lagi untuk botol gratis.”
- Galat: selalu sebut penyebab dan langkah berikutnya.

---

## 9. Arsitektur & Tech Stack

### 9.1 Pilihan teknologi

| Lapisan | Pilihan | Alasan |
| --- | --- | --- |
| Aplikasi | Next.js (App Router) + TypeScript, API lewat route handler | Satu kode untuk web dan API, sudah dikuasai |
| Antarmuka | Tailwind CSS + komponen bergaya shadcn/ui (Radix) + ikon Lucide | Cepat dan aksesibel |
| Form dan validasi | React Hook Form + Zod | Skema validasi dipakai ulang di server |
| Basis data | MySQL-compatible lewat Prisma: MySQL/MariaDB lokal atau server pribadi; TiDB Cloud untuk staging Vercel | Satu skema dan driver MariaDB-compatible di seluruh lingkungan |
| Penyimpanan berkas | S3-compatible privat untuk struk/bukti bayar; Cloudinary hanya untuk aset katalog publik | Dokumen transaksi tetap privat dan dapat dihapus sesuai retensi |
| Proses gambar | `sharp` | Ubah ukuran, WEBP, hapus EXIF |
| Sesi pelanggan | Cookie httpOnly berisi token acak, hash tersimpan di DB | Tanpa password |
| Admin | Email + kata sandi (argon2) + TOTP, di balik Cloudflare Access | Panel sensitif |
| Tugas terjadwal | Vercel Cron harian untuk staging; worker/cron di server pribadi saat produksi | Hapus struk, hangus stamp, kedaluwarsa kode, backup |
| PWA | Manifest + service worker, halaman offline | Bisa dipasang di layar utama |
| Analytics | GA4 atau Umami self-host, event khusus bagian 17 | Ukur corong QR ke stamp |
| Pemantauan | Endpoint `/api/health`; Telegram untuk alert admin opsional; Uptime Kuma/ntfy di server pribadi | Pisahkan alert staging dan operasional produksi |
| Notifikasi pelanggan | WhatsApp untuk login; OneSignal untuk push status pesanan/stamp setelah opt-in | Tidak memakai email/Brevo atau push promosi |
| Deploy staging | Vercel + TiDB Cloud, origin publik stabil dan data sintetis | Uji sebelum produksi tanpa mengubah target server pribadi |
| Deploy produksi | Coolify + Docker + Cloudflare Tunnel pada server Cartive | Target 24/7 setelah server siap |
| Nanti | Tesseract di server (OCR), Midtrans (pembayaran), kampanye WhatsApp | Setelah ada volume dan izin |

### 9.2 Diagram komponen

```
Pelanggan (HP/tablet/PC)
        |
   +----+------------------------------+
   |                                   |
Vercel (staging)                 Cloudflare Tunnel
   |                                   |
Next.js (web + API)             Coolify (produksi nanti)
   |                                   |
TiDB Cloud (uji)                 MySQL/TiDB (server pribadi)
   |                                   |
S3-compatible privat <---------- S3-compatible privat
   |
Telegram (alert admin) / OneSignal (push setelah opt-in)

Admin --> Cloudflare Access --> /admin
Uptime Kuma --> /api/health --> ntfy (server pribadi)
```

### 9.3 Struktur folder

```
cartive/
  prisma/            schema.prisma, migrations, seed
  src/app/           halaman publik, /admin, /api/v1
  src/components/    ui, kartu, stamp, form
  src/lib/           db, auth, storage, wa, rules, ledger
  src/jobs/          retention, expiry, backup
  public/            ikon, manifest, aset
  docs/              dokumen ini (salinan markdown)
```

### 9.4 Variabel lingkungan (nama saja)

`DATABASE_URL`, `DB_CONNECTION_LIMIT`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `ADMIN_EMAILS`, `WHATSAPP_CLOUD_*`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `NEXT_PUBLIC_ONESIGNAL_APP_ID`, dan `ONESIGNAL_REST_API_KEY`. Rahasia disimpan di password manager dan pengaturan Vercel/Coolify, tidak pernah di repositori. Brevo tidak digunakan; login tetap melalui WhatsApp.

---

## 10. ERD & Data Dictionary

### 10.1 Skema (Prisma)

```prisma
enum Platform { GOFOOD GRABFOOD SHOPEEFOOD }
enum ClaimStatus { PENDING AUTO_APPROVED NEEDS_REVIEW APPROVED REJECTED }
enum LedgerReason { CLAIM WEB_ORDER REDEEM EXPIRE ADJUST }
enum RewardType { VOUCHER_2K FREE_BOTTLE }
enum RewardStatus { AVAILABLE USED EXPIRED }
enum OrderStatus { PENDING_PAYMENT PAID PREPARING READY COMPLETED CANCELLED }
enum Fulfillment { PICKUP DELIVERY }
enum Line { REKA SELA }

model Member {
  id               String    @id @default(cuid())
  waNumber         String    @unique
  waVerifiedAt     DateTime?
  consentPrivacyAt DateTime
  consentPromoAt   DateTime?
  lastActivityAt   DateTime  @default(now())
  createdAt        DateTime  @default(now())
  deletedAt        DateTime?
  sessions Session[]
  claims   Claim[]
  ledger   StampLedger[]
  rewards  Reward[]
  orders   Order[]
  waVerifications WaVerification[]
}

model Session {
  id        String   @id @default(cuid())
  memberId  String
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  member    Member   @relation(fields: [memberId], references: [id])
}

model Claim {
  id          String      @id @default(cuid())
  memberId    String
  platform    Platform
  orderId     String
  dedupeKey   String?     @unique
  bottleCount Int         @default(1)
  status      ClaimStatus @default(PENDING)
  reasonCode  String?
  imageKey    String?
  imageHash   String?
  orderedAt   DateTime?
  reviewedBy  String?
  createdAt   DateTime    @default(now())
  member      Member      @relation(fields: [memberId], references: [id])
  @@index([status, createdAt])
  @@index([imageHash])
  @@index([memberId, createdAt])
}

model StampLedger {
  id        String       @id @default(cuid())
  memberId  String
  delta     Int
  reason    LedgerReason
  refType   String?
  refId     String?
  createdAt DateTime     @default(now())
  member    Member       @relation(fields: [memberId], references: [id])
  @@index([memberId, createdAt])
}

model Reward {
  id         String       @id @default(cuid())
  memberId   String
  type       RewardType
  code       String       @unique
  status     RewardStatus @default(AVAILABLE)
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime     @default(now())
  member     Member       @relation(fields: [memberId], references: [id])
}

model WaVerification {
  id          String    @id @default(cuid())
  memberId    String
  code        String    @unique
  createdAt   DateTime  @default(now())
  confirmedAt DateTime?
  confirmedBy String?
  member      Member    @relation(fields: [memberId], references: [id])
}

model Product {
  id        String  @id @default(cuid())
  slug      String  @unique
  name      String
  line      Line
  description String?
  priceWeb  Int
  imageKey  String?
  active    Boolean @default(true)
  sortOrder Int     @default(0)
  batches   Batch[]
  items     OrderItem[]
}

model Batch {
  id            String   @id @default(cuid())
  productId     String
  code          String   @unique
  producedAt    DateTime
  consumeBefore DateTime
  qtyMade       Int
  qtySold       Int      @default(0)
  product       Product  @relation(fields: [productId], references: [id])
}

model Order {
  id          String      @id @default(cuid())
  code        String      @unique
  memberId    String
  status      OrderStatus @default(PENDING_PAYMENT)
  fulfillment Fulfillment
  subtotal    Int
  shipping    Int         @default(0)
  discount    Int         @default(0)
  total       Int
  zone        String?
  address     String?
  note        String?
  voucherCode String?
  proofKey    String?
  paidAt      DateTime?
  createdAt   DateTime    @default(now())
  member      Member      @relation(fields: [memberId], references: [id])
  items       OrderItem[]
  @@index([status, createdAt])
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  productId String
  qty       Int
  unitPrice Int
  order     Order   @relation(fields: [orderId], references: [id])
  product   Product @relation(fields: [productId], references: [id])
}

model AdminUser {
  id           String @id @default(cuid())
  email        String @unique
  passwordHash String
  totpSecret   String
  createdAt    DateTime @default(now())
}

model AuditLog {
  id         String   @id @default(cuid())
  actorType  String
  actorId    String?
  action     String
  entity     String
  entityId   String?
  detail     Json?
  createdAt  DateTime @default(now())
  @@index([entity, entityId])
}

model PlatformRule {
  platform        Platform @id
  orderIdPattern  String
  merchantKeyword String
  maxAgeHours     Int      @default(48)
  active          Boolean  @default(true)
}

model Setting {
  key   String @id
  value Json
}
```

### 10.2 Data dictionary: aturan penting

| Kolom | Aturan |
| --- | --- |
| `Member.waNumber` | Format 62xxxxxxxxxx (10–15 digit), unik. Ditampilkan tersamar (0812 \*\*\*\* 7890) |
| `Claim.dedupeKey` | Diisi `platform:orderId` saat klaim dibuat, **dikosongkan (NULL) bila klaim ditolak**. Kolom unik menolak duplikat, sedangkan NULL boleh banyak |
| `Claim.status` | Lihat alur di bagian 6.3 |
| `StampLedger.delta` | Positif (klaim, order web), negatif (tebus, hangus). Saldo = jumlah delta |
| `Reward.code` | 6 karakter, tanpa huruf mirip (O/0, I/1), berlaku 7 hari |
| `PlatformRule.orderIdPattern` | Ekspresi reguler, diisi setelah ada 10 contoh struk asli per platform |
| `Order.code` | Bentuk CRT-YYMMDD-NNN, mudah dibacakan lewat chat |
| `Batch` | Mencatat batch produksi untuk stok dan kedaluwarsa |

**Penyempurnaan BR-07:** klaim yang ditolak karena alasan teknis (foto buram, salah format) **tidak mengunci** order ID, sehingga pelanggan jujur bisa mengirim ulang. Order ID baru terkunci setelah klaim diterima atau sedang menunggu review.

### 10.3 Integritas data

- Persetujuan klaim dan penulisan ledger terjadi dalam **satu transaksi** database.
- Tebus reward memakai transaksi dengan kunci baris pada anggota untuk mencegah tebus ganda saat ditekan dua kali. Saldo harus cukup di dalam transaksi yang sama.
- Pengiriman klaim membawa `Idempotency-Key` agar tombol yang ditekan dua kali tidak membuat dua klaim.
- Penghapusan data: anggota dianonimkan (nomor diganti penanda, persetujuan dicatat), bukan baris pesanan dihapus, agar laporan tetap utuh.

---

## 11. API Spec (ringkas)

Awalan `/api/v1`. Format respons: `{ data, error: { code, message } }`. Kode HTTP: 200, 201, 400 (input salah), 401, 403, 404, 409 (duplikat), 413 (berkas besar), 422 (gagal aturan), 429 (terlalu sering), 500.

### 11.1 Pelanggan

| Metode | Path | Auth | Fungsi |
| --- | --- | --- | --- |
| POST | `/auth/wa` | – | Buat atau temukan anggota dari nomor + persetujuan, set cookie sesi |
| POST | `/auth/logout` | Sesi | Akhiri sesi |
| GET | `/me` | Sesi | Nomor tersamar, status verifikasi, saldo stamp |
| PATCH | `/me/consent` | Sesi | Ubah persetujuan promosi |
| DELETE | `/me` | Sesi | Ajukan penghapusan data |
| GET | `/stamps` | Sesi | Saldo dan progres menuju reward |
| GET | `/claims` | Sesi | Riwayat klaim (paginasi) |
| POST | `/claims` | Sesi | Kirim klaim (multipart: platform, orderId, receipt). Header `Idempotency-Key` |
| GET | `/claims/:id` | Sesi | Detail dan status klaim |
| GET | `/rewards` | Sesi | Hadiah tersedia dan yang sudah dipakai |
| POST | `/rewards/redeem` | Sesi + terverifikasi | Tebus hadiah, kembalikan kode |
| POST | `/wa/verification` | Sesi | Buat kode verifikasi, kembalikan tautan wa.me |
| GET | `/products` | – | Daftar menu dan stok (MVP-2) |
| GET | `/products/:slug` | – | Detail produk (MVP-2) |
| POST | `/orders` | Sesi | Buat pesanan dan instruksi bayar (MVP-2) |
| GET | `/orders/:code` | Sesi pemilik | Status pesanan (MVP-2) |
| POST | `/orders/:code/payment-proof` | Sesi pemilik | Unggah bukti bayar (MVP-2) |
| GET | `/health` | – | Status aplikasi untuk Uptime Kuma |

### 11.2 Admin (`/admin/...`, wajib sesi admin + TOTP)

| Metode | Path | Fungsi |
| --- | --- | --- |
| POST | `/admin/auth/login` | Email, kata sandi, kode TOTP |
| GET | `/admin/claims?status=` | Antrean klaim |
| POST | `/admin/claims/:id/approve` | Setujui, tulis ledger |
| POST | `/admin/claims/:id/reject` | Tolak dengan `reasonCode` dan catatan |
| GET | `/admin/members` | Cari anggota |
| PATCH | `/admin/members/:id/verify-wa` | Tandai nomor terverifikasi |
| POST | `/admin/rewards/:code/use` | Tandai kode tebus terpakai |
| GET / PATCH | `/admin/orders`, `/admin/orders/:code/status` | Kelola pesanan |
| CRUD | `/admin/products`, `/admin/batches` | Menu, harga, stok batch |
| GET / PUT | `/admin/settings` | Aturan stamp, zona ongkir, gambar QRIS |
| GET | `/admin/export/:entity.csv` | Ekspor data |
| GET | `/admin/audit` | Log audit |

### 11.3 Kode galat

`INVALID_WA`, `ORDER_DUPLICATE`, `CLAIM_TOO_OLD`, `FORMAT_MISMATCH`, `IMAGE_UNREADABLE`, `DAILY_LIMIT`, `NOT_VERIFIED`, `INSUFFICIENT_STAMPS`, `OUT_OF_STOCK`, `RATE_LIMITED`. Pesan ke pelanggan mengikuti tabel 6.6.

---

## 12. Keamanan, Kepatuhan & Privacy Policy

### 12.1 Ancaman dan kontrol

| Ancaman | Kontrol |
| --- | --- |
| Orang lain memakai nomor korban | Fuel Card hanya menampilkan nomor tersamar dan jumlah stamp. Tebus hadiah wajib verifikasi WA. Rate limit |
| Bot dan spam klaim | Cloudflare Turnstile pada form masuk dan klaim, kolom jebakan (honeypot), rate limit bagian 6.5 |
| Unggahan berbahaya | Cek tipe asli berkas, ubah ulang lewat `sharp`, batas 5 MB, bucket privat, tidak pernah dieksekusi |
| Klaim palsu | Pemeriksaan berlapis (6.4), antrean review, klaim bisa dibatalkan lewat ledger penyeimbang |
| Pelanggan A melihat data pelanggan B (IDOR) | Setiap query disaring `memberId` dari sesi, bukan dari parameter URL |
| XSS dan injeksi | Validasi Zod di server, query berparameter lewat Prisma, escape bawaan React, header CSP |
| CSRF | Cookie `SameSite=Lax`, cek Origin pada aksi yang mengubah data |
| Pengambilalihan admin | Kata sandi argon2, TOTP wajib, Cloudflare Access pada `/admin`, sesi pendek, log audit |
| Kebocoran rahasia | Variabel lingkungan Vercel/Coolify dan password manager, rotasi berkala, tidak ada di repositori |
| Kehilangan data | Backup harian + salinan off-site (bagian 13) |
| Pustaka rentan | Kunci versi lewat lockfile, jalankan `npm audit` tiap rilis |

**Header keamanan:** HSTS, Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (kamera hanya untuk halaman klaim).

### 12.2 Kepatuhan UU PDP No. 27 Tahun 2022

| Hal | Rancangan (final ditetapkan bersama konsultan hukum) |
| --- | --- |
| Data yang diproses | Nomor WA, riwayat klaim dan pesanan, foto struk (bisa memuat nama atau alamat), alamat antar (MVP-2) |
| Dasar pemrosesan | Persetujuan yang jelas, terpisah untuk promosi |
| Prinsip minimal data | Tidak meminta nama, email, atau tanggal lahir di MVP |
| Retensi usulan | Foto struk 30 hari. Klaim dan ledger selama akun aktif. Log audit 12 bulan. Akun tidak aktif 24 bulan dianonimkan |
| Hak pelanggan | Akses, perbaikan, penghapusan, tarik persetujuan, keberatan. Diajukan lewat halaman profil atau WA |
| Insiden kebocoran | Deteksi → isolasi → nilai dampak → beri tahu pelanggan terdampak secepatnya → catat. UU PDP memuat batas waktu 3×24 jam untuk beberapa kewajiban, pastikan detailnya |
| Pihak ketiga | Cloudflare, penyedia analytics, hosting. Disebut di kebijakan privasi |

### 12.3 Kerangka Kebijakan Privasi

1. Siapa kami dan cara menghubungi.
2. Data yang dikumpulkan dan alasannya.
3. Dasar persetujuan dan cara menariknya.
4. Lama penyimpanan.
5. Pihak ketiga yang menerima data.
6. Hak pelanggan dan cara menggunakannya.
7. Keamanan data secara garis besar.
8. Perubahan kebijakan.

### 12.4 Kerangka Syarat Program Loyalty

- Cara kerja stamp, batas klaim, masa berlaku stamp dan kode tebus.
- Hak Cartive membatalkan klaim yang terbukti tidak sah dan menutup akun penyalahguna.
- Hak mengubah program dengan pemberitahuan.
- **Pernyataan:** Cartive tidak berafiliasi dengan GoFood, GrabFood, atau ShopeeFood. Nama platform hanya disebut sebagai sumber pembelian.

---

## 13. Deploy Plan

### 13.1 Lingkungan

| Lingkungan | Fungsi | Alamat |
| --- | --- | --- |
| Lokal | Pengembangan | `localhost` |
| Staging sementara | Uji sebelum rilis, data sintetis; Vercel + TiDB Cloud terpisah dari produksi | Origin Vercel stabil, publik dan `noindex` |
| Produksi | Pelanggan | Domain Cartive (belum ditentukan) |

### 13.2 Langkah deploy

#### Staging sementara (Vercel + TiDB Cloud)

1. Hubungkan repositori Git Cartive ke proyek Vercel dengan root directory `cartive-web`; build menjalankan `prisma generate` lalu `next build`, tanpa migrasi otomatis.
2. Sediakan database TiDB Cloud khusus staging. Gunakan `DATABASE_URL` bert TLS terverifikasi (`sslaccept=strict`), `DB_CONNECTION_LIMIT=1`, dan kredensial/stempel sesi khusus staging.
3. Jalankan migrasi secara terencana terhadap database staging sebelum rilis skema. Jangan menjalankan migrasi produksi dari build Vercel.
4. Konfigurasikan HTTPS object storage S3-compatible privat yang dapat dijangkau Vercel untuk struk dan bukti bayar. Cloudinary hanya untuk aset publik dan bukan pengganti storage privat.
5. Tetapkan `CARTIVE_DEPLOYMENT_ENV=staging`, `NEXT_PUBLIC_SITE_URL` ke origin Vercel stabil, `CRON_SECRET`, serta kunci WhatsApp/Turnstile yang sah untuk origin staging. Tanpa storage privat, WhatsApp, atau Turnstile, alur terkait tetap nonaktif dan tidak memakai fallback produksi.
6. Konfigurasikan Telegram admin alerts dan OneSignal secara opsional. Pesan admin tidak memuat data pribadi; push pelanggan hanya status pesanan/stamp setelah opt-in. Origin server pribadi memerlukan aplikasi OneSignal terpisah. Brevo tidak dipakai.
7. `vercel.json` menjalankan maintenance sekali sehari pada deployment Vercel Production, bukan Preview. Jika deployment Production dipakai sebagai staging, pastikan cron hanya memakai database uji. Staging publik tetap memakai data sintetis dan `noindex`.

#### Produksi kelak (Coolify)

1. Repositori Git khusus Cartive. Cabang `main` = produksi.
2. `Dockerfile` multi-tahap (Next.js mode standalone). Worker memakai image yang sama dengan perintah berbeda.
3. Layanan: `app`, `worker`, MySQL-compatible database, dan MinIO/S3 privat (bila belum ada). Satu jaringan internal.
4. Isi variabel lingkungan (bagian 9.4) di Coolify.
5. Perintah sebelum deploy: `prisma migrate deploy`.
6. Healthcheck ke `/api/health`.
7. Domain lewat Cloudflare Tunnel. Cloudflare Access untuk jalur `/admin`. Kunci Turnstile dipasang.
8. Rilis: PR → staging → gabung ke `main` → beri tag versi. Rollback lewat deployment sebelumnya di Coolify. Migrasi dibuat kompatibel ke belakang.

### 13.3 Backup dan pemulihan

- Backup harian database MySQL-compatible dan object storage. Simpan 7 harian + 4 mingguan pada media privat.
- **Salinan off-site wajib sebelum go-live** (mis. sinkronisasi terenkripsi ke penyimpanan cloud), karena disk cadangan lokal belum bisa diandalkan.
- Uji pemulihan satu kali sebelum go-live, lalu tiap bulan.

### 13.4 Pemantauan dan darurat

- Uptime Kuma memeriksa `/api/health` tiap menit, peringatan lewat ntfy. Telegram admin alerts aplikasi hanya untuk kejadian order/klaim/bukti baru dan tidak menggantikan pemantauan uptime.
- Jika server mati: halaman perawatan statis (dari Cloudflare) memberi tahu pelanggan bahwa klaim tetap bisa dilakukan nanti. **Jendela klaim 48 jam diperpanjang otomatis selama ada gangguan**, supaya pelanggan tidak dirugikan.
- Penjualan di platform tidak bergantung pada web, jadi gangguan web hanya menunda loyalty.

### 13.5 Checklist go-live

- [ ] Semua tes kritis (bagian 16) lulus.
- [ ] Backup off-site berjalan dan pemulihan sudah diuji.
- [ ] Admin TOTP aktif dan Cloudflare Access terpasang.
- [ ] Kebijakan privasi dan syarat program tayang.
- [ ] Stiker QR diuji pindai di botol basah.
- [ ] Pola order ID tiap platform terisi dari struk asli.
- [ ] Pemeriksaan T&C platform selesai.
- [ ] Uptime Kuma dan ntfy aktif.

---

## 14. Breakdown, Estimasi, Timeline, Backlog & Milestone

### 14.1 Jalur cepat: validasi dulu tanpa kode

Sebelum membangun web penuh, jalankan batch pertama dengan **Google Form + Google Sheet** (nomor WA, platform, order ID, foto struk). Catat berapa persen botol yang diklaim dan apa kendalanya. Hasilnya menentukan seberapa besar insentif yang perlu dibangun. Ambang keputusan ditetapkan bersama data nyata, misalnya bila klaim sangat rendah, ubah insentif dan tampilan stiker sebelum menambah fitur.

### 14.2 Breakdown dan estimasi (jam kerja efektif)

| Milestone | Isi | Estimasi |
| --- | --- | --- |
| M0 Fondasi | Repo, Docker, DB, Prisma, token desain, layout, PWA dasar | 10–14 |
| M1 Identitas & Fuel Card | Masuk nomor WA, sesi, ledger, landing, kartu, mode gelap | 16–20 |
| M2 Klaim | Form, unggah, `sharp`, MinIO, aturan, rate limit, riwayat | 20–26 |
| M3 Admin MVP-1 | Login + TOTP, antrean klaim, anggota, verifikasi WA, audit | 16–22 |
| M4 Reward & verifikasi | Tebus, kode, worker kedaluwarsa dan hangus | 10–14 |
| M5 Pengerasan & rilis MVP-1 | Privasi, header, tes, deploy, backup, UAT | 14–18 |
| **Total MVP-1** |  | **86–114** |
| M6 Menu & stok | Produk, batch, halaman menu | 14–18 |
| M7 Keranjang & checkout | QRIS statis, bukti bayar, status | 18–24 |
| M8 Admin pesanan | Pesanan, batch, voucher, ekspor | 14–18 |
| M9 Poles MVP-2 | SEO, analytics, UAT | 10–14 |
| **Total MVP-2** |  | **56–74** |

### 14.3 Timeline berbasis kapasitas

Karena jadwal kerja tidak tetap, durasi dihitung dari jam yang tersedia per minggu.

| Jam efektif per minggu | MVP-1 (≈100 jam) | MVP-2 (≈65 jam) |
| --- | --- | --- |
| 10 | ≈ 10 minggu | ≈ 6,5 minggu |
| 20 | ≈ 5 minggu | ≈ 3,3 minggu |
| 30 | ≈ 3,3 minggu | ≈ 2,2 minggu |

Angka ini perkiraan kasar. Perbarui setelah M1 selesai, dengan kecepatan nyata.

### 14.4 Backlog awal

| ID | Item | Prioritas | Jam | Milestone |
| --- | --- | --- | --- | --- |
| B01 | Inisialisasi proyek, Docker, Prisma, CI sederhana | Must | 6 | M0 |
| B02 | Token desain, tema terang/gelap, layout responsif | Must | 6 | M0 |
| B03 | PWA dasar (manifest, ikon, halaman offline) | Should | 3 | M0 |
| B04 | Landing + parameter sumber | Must | 4 | M1 |
| B05 | Masuk nomor WA, sesi cookie, normalisasi nomor | Must | 8 | M1 |
| B06 | Ledger stamp dan kartu Fuel Card | Must | 8 | M1 |
| B07 | Form klaim + validasi Zod | Must | 6 | M2 |
| B08 | Unggah, proses `sharp`, simpan MinIO | Must | 8 | M2 |
| B09 | Mesin aturan klaim (6.4) + `dedupeKey` | Must | 8 | M2 |
| B10 | Riwayat klaim | Must | 4 | M2 |
| B11 | Rate limit + Turnstile | Must | 4 | M2 |
| B12 | Admin: login, TOTP, Cloudflare Access | Must | 8 | M3 |
| B13 | Admin: antrean klaim + setujui/tolak | Must | 8 | M3 |
| B14 | Admin: anggota, verifikasi WA, audit | Must | 6 | M3 |
| B15 | Tebus reward + kode + transaksi aman | Must | 8 | M4 |
| B16 | Worker: hangus stamp, kedaluwarsa kode, hapus struk | Must | 6 | M4 |
| B17 | Halaman privasi, syarat, cara kerja | Must | 4 | M5 |
| B18 | Header keamanan, tes kritis, backup, deploy | Must | 12 | M5 |
| B19 | Menu, detail produk, stok batch | Must | 16 | M6 |
| B20 | Keranjang, checkout, zona ongkir | Must | 12 | M7 |
| B21 | QRIS statis + unggah bukti + status pesanan | Must | 10 | M7 |
| B22 | Admin pesanan, voucher, ekspor CSV | Should | 14 | M8 |
| B23 | OCR pemeriksa silang | Could | 12 | Nanti |
| B24 | Payment gateway | Could | 16 | Nanti |
| B25 | Kampanye WhatsApp resmi di luar OTP login | Could | 14 | Nanti |

### 14.5 Definition of Done

Setiap item selesai bila: berjalan di HP dan desktop, tes terkait lulus, tidak ada galat di konsol, label dan kontras dasar terpenuhi, migrasi aman, dan catatan perubahan diperbarui.

### 14.6 Kriteria selesai milestone MVP

- **MVP-1 selesai** bila pelanggan dapat scan → masuk → klaim → melihat stamp → menebus hadiah, admin dapat meninjau klaim, dan checklist go-live (13.5) terpenuhi.
- **MVP-2 selesai** bila pelanggan dapat memesan dan membayar di web, admin dapat memproses pesanan sampai selesai, dan stamp 2× masuk otomatis.

---

## 15. Risk Register

| ID | Risiko | Dampak | Peluang | Mitigasi |
| --- | --- | --- | --- | --- |
| R01 | Platform menindak QR/loyalty (toko ditangguhkan) | Tinggi | Sedang | Baca T&C, framing loyalty, mulai satu platform |
| R02 | Sedikit pelanggan yang scan | Tinggi | Sedang | Insentif cepat (3 stamp), stiker menonjol, uji teks stiker |
| R03 | Struk palsu | Sedang | Sedang | Pemeriksaan berlapis, reward kecil, review manual |
| R04 | Server rumah mati atau jaringan seluler tidak stabil | Sedang | Sedang | Health check, halaman perawatan, jendela klaim diperpanjang, backup off-site, siapkan VPS kecil bila perlu |
| R05 | Kehilangan data | Tinggi | Rendah | Backup off-site dan uji pemulihan |
| R06 | Waktu pengembang terbatas | Tinggi | Tinggi | Milestone kecil, validasi tanpa kode dulu, cakupan dipotong |
| R07 | Kebocoran data pribadi | Tinggi | Rendah | Data minimal, retensi, akses admin ketat, rencana insiden |
| R08 | Format struk platform berubah | Sedang | Sedang | Pola di tabel konfigurasi, jalur review manual |
| R09 | Verifikasi WA manual menumpuk | Rendah | Sedang | Hanya saat tebus, nanti WA API |
| R10 | Izin pangan dan label terlambat | Tinggi | Sedang | Mulai paralel, tunda go-live platform bila belum siap |
| R11 | Biaya WA API membengkak | Sedang | Rendah | Mulai opsi A, batasi broadcast |
| R12 | HPP di atas target | Sedang | Sedang | Lihat Dokumen Master bagian 1.5 |
| R13 | Bot menyerbu form | Sedang | Sedang | Turnstile, rate limit, honeypot |
| R14 | Desain atau kemasan terlalu mirip merek lain | Sedang | Rendah | Desain orisinal, cek merek di DJKI |

---

## 16. Test Plan, QA & UAT

### 16.1 Strategi

| Jenis | Alat | Cakupan |
| --- | --- | --- |
| Unit | Vitest | Normalisasi nomor, pola order ID, hitung stamp dan reward, umur klaim |
| Integrasi | Vitest + DB uji | API klaim, ledger, transaksi tebus, `dedupeKey` |
| End-to-end | Playwright | Flow A, B, C, D di viewport mobile dan desktop |
| Keamanan | Manual + skrip | Unggahan berbahaya, IDOR, rate limit, header |
| Performa | Lighthouse (mobile) | Landing dan Fuel Card |
| Aksesibilitas | axe + uji keyboard | Semua layar utama |

### 16.2 Kasus uji kritis

| ID | Skenario | Hasil yang diharapkan |
| --- | --- | --- |
| TC-01 | Isi nomor 0812-3456-7890 | Tersimpan 6281234567890 |
| TC-02 | Klaim order ID yang sama dua kali | Kedua: 409 ORDER\_DUPLICATE |
| TC-03 | Dua tab mengirim klaim sama bersamaan | Hanya satu berhasil |
| TC-04 | Tekan Tebus dua kali cepat | Hanya satu hadiah terbit, stamp berkurang sekali |
| TC-05 | Berkas .exe diganti nama .jpg | Ditolak |
| TC-06 | Klaim ditolak (foto buram), kirim ulang order ID sama | Diperbolehkan |
| TC-07 | Struk lebih dari 48 jam | Ditolak CLAIM\_TOO\_OLD |
| TC-08 | Pelanggan A membuka klaim milik B | 404 atau 403 |
| TC-09 | Stamp tidak aktif 90 hari | Dihanguskan worker, ledger tercatat |
| TC-10 | Checkout saat stok habis | Ditolak OUT\_OF\_STOCK |
| TC-11 | Mode gelap pada semua layar | Kontras terbaca, tidak ada teks hilang |
| TC-12 | Buka web tanpa internet (PWA) | Halaman offline tampil |
| TC-13 | Enam kali masuk dalam semenit | 429 RATE\_LIMITED |
| TC-14 | Hapus data pelanggan | Nomor dianonimkan, pesanan tetap ada |

### 16.3 Matriks perangkat

- **Peramban:** Chrome Android, Samsung Internet, Safari iPhone, Safari iPad, Chrome/Edge Windows, Safari/Firefox macOS.
- **Lebar layar:** 360, 390, 768, 1024, 1440 px.
- Uji di minimal satu HP Android kelas menengah dengan jaringan 4G nyata.

### 16.4 Ambang kualitas (Lighthouse mobile)

Performa ≥ 85, Aksesibilitas ≥ 95, Best Practices ≥ 95, SEO ≥ 90 untuk halaman yang diindeks.

### 16.5 UAT dengan pelanggan nyata

5–10 orang menjalankan tugas: scan QR dan klaim stamp (target di bawah 1 menit), melihat stamp, menebus hadiah. Setelah itu tiga pertanyaan: bagian mana yang membingungkan, apakah hadiahnya menarik, dan apakah mereka akan scan lagi. Hasil dicatat sebagai masukan sebelum rilis luas.

---

## 17. SEO, Analytics, Aset & Daftar Dependensi

### 17.1 SEO

- **Diindeks:** `/`, `/menu`, `/menu/[slug]`, `/cara-kerja`, `/privasi`, `/syarat`.
- **Tidak diindeks (`noindex`):** `/kartu*`, `/hadiah`, `/profil`, `/verifikasi`, `/pesanan*`, `/admin*`.
- Judul dan deskripsi unik per halaman, gambar OG 1200×630, `sitemap.xml`, `robots.txt`, data terstruktur produk (nama, harga, ketersediaan).
- Lalu lintas utama datang dari QR, jadi SEO bukan prioritas MVP-1.

### 17.2 Event analytics

| Event | Kapan |
| --- | --- |
| `scan_qr` | Landing dibuka dengan `?s=botol` |
| `wa_submitted` | Nomor berhasil dikirim |
| `claim_started` / `claim_submitted` | Form klaim dibuka / dikirim |
| `claim_approved` | Klaim disetujui |
| `reward_redeemed` | Hadiah ditebus |
| `menu_viewed`, `add_to_cart`, `checkout_started`, `order_paid` | Corong pembelian web (MVP-2) |

Corong utama: scan → nomor → klaim → disetujui → klaim kedua (repeat). Jangan mengirim nomor WA ke alat analytics.

### 17.3 Daftar aset

| Aset | Spesifikasi |
| --- | --- |
| Logo Cartive | SVG + PNG, versi terang dan gelap |
| Ikon aplikasi | 192 dan 512 px, versi maskable |
| Ikon biji kopi (stamp) | SVG, dua keadaan: kosong dan terisi |
| Foto 6 varian | Rasio 4:5 dan 1:1, latar netral, botol berembun |
| Foto gaya hidup | Tangan memegang botol, untuk konten promosi |
| Seni label Reka dan Sela | Siap cetak sesuai bagian 8.7 |
| Stiker QR | Vektor, uji pindai |
| Gambar QRIS statis | Dari penyedia pembayaran, untuk MVP-2 |
| Gambar OG | 1200×630 |
| Ilustrasi keadaan kosong | 2–3 gambar sederhana |

### 17.4 Daftar dependensi (draft)

| Kebutuhan | Paket |
| --- | --- |
| Kerangka kerja | `next`, `react`, `typescript` |
| Gaya dan UI | `tailwindcss`, `@radix-ui/*`, `lucide-react` |
| Form dan validasi | `react-hook-form`, `zod` |
| Data | `prisma`, `@prisma/client` |
| Gambar dan berkas | `sharp`, `@aws-sdk/client-s3` (untuk MinIO) |
| Keamanan admin | `argon2`, `otplib` |
| PWA | `serwist` atau `next-pwa` |
| Tugas terjadwal | `node-cron` |
| Pengujian | `vitest`, `@playwright/test`, `@axe-core/playwright` |
| Kualitas kode | `eslint`, `prettier` |

Versi dikunci lewat lockfile dan diperbarui terjadwal. Pilih versi stabil terbaru saat proyek diinisialisasi.

---

## 18. Dokumen Pendamping

### 18.1 Kerangka README

```
# Cartive Web
Web loyalty dan toko langsung untuk Cartive.

## Fitur
- Fuel Card dan klaim stamp
- Toko langsung (MVP-2)
- Panel admin

## Menjalankan lokal
1. Salin .env.example menjadi .env, isi variabel
2. docker compose up -d   (MySQL dan penyimpanan S3-compatible lokal)
3. npm install
4. npx prisma migrate dev
5. npm run dev

## Perintah
npm run test | npm run lint | npm run build

## Deploy
Lihat bagian Deploy Plan dokumen ini.

## Struktur folder
Lihat bagian Arsitektur.
```

### 18.2 Panduan admin harian

1. Buka antrean klaim, setujui atau tolak (alasan wajib).
2. Konfirmasi bukti bayar pesanan web dan ubah statusnya (MVP-2).
3. Perbarui stok batch setelah produksi.
4. Tandai kode tebus yang dipakai.
5. Cek Uptime Kuma dan pastikan backup malam sebelumnya berhasil.
6. Mingguan: lihat laporan corong dan ekspor data bila perlu.

### 18.3 Kerangka manual pengguna (pelanggan)

1. Apa itu Fuel Card.
2. Cara klaim stamp (3 langkah bergambar).
3. Cara menebus hadiah.
4. Cara memesan langsung di web (MVP-2).
5. FAQ: klaim ditolak, lupa nomor, stamp hangus, hapus data, hubungi kami.

### 18.4 Kerangka Changelog

```
# Changelog
## [0.1.0] - tanggal
### Ditambahkan
- Fondasi proyek, tema, layout
### Diubah
### Diperbaiki
```

Penomoran versi: 0.x selama MVP, 1.0.0 saat go-live publik.

---

## Glosarium

| Istilah | Arti sederhana |
| --- | --- |
| Stamp | Poin per botol yang dikumpulkan di Fuel Card |
| Fuel Card | Kartu loyalty digital pelanggan di web |
| Ledger | Buku catatan semua penambahan dan pengurangan stamp, saldo dihitung darinya |
| Order ID | Nomor pesanan di struk platform |
| QR statis | QR yang sama untuk semua botol |
| Opt-in | Persetujuan yang dicentang sendiri oleh pelanggan |
| PWA | Web yang bisa dipasang di layar utama seperti aplikasi |
| OCR | Teknologi pembaca teks dari gambar |
| Rate limit | Batas jumlah permintaan per waktu untuk mencegah spam |
| Idempotency key | Kunci agar permintaan yang terkirim dua kali hanya diproses sekali |
| Retensi | Lama data disimpan sebelum dihapus |
| Anonimisasi | Mengubah data sehingga tidak lagi menunjuk ke orang tertentu |
| TOTP | Kode 6 digit berubah-ubah dari aplikasi autentikator |
| Turnstile | Pemeriksa anti-bot gratis dari Cloudflare |
| Tunnel | Jalur aman dari Cloudflare ke server sendiri tanpa membuka port |
| Batch | Satu kali produksi botol |
| MVP | Versi pertama yang cukup untuk dipakai dan dipelajari |
| PRD, SRS, ERD, UAT | Dokumen kebutuhan produk, spesifikasi kebutuhan, diagram relasi data, uji penerimaan pengguna |

---

## 19. Roadmap Autopilot: Otomatis tapi Tetap Tenang

**Prinsip:** yang rutin dikerjakan sistem, manusia hanya menangani yang tidak biasa, dan **sistem yang memberi tahu pemilik, bukan pemilik yang harus mengecek**. Tujuannya bisnis tetap berjalan saat pemilik sedang bekerja dan tidak memegang HP atau laptop, dengan risiko yang dibatasi oleh pengaman di bawah.

### 19.1 Tahap autopilot

| Tahap | Kapan naik | Otomatis | Masih manual |
| --- | --- | --- | --- |
| **A0** (MVP-1 awal) | Saat go-live | Klaim yang lolos semua aturan disetujui langsung. Stamp dan reward dihitung sendiri | Klaim yang ragu, verifikasi WA, konfirmasi bayar QRIS |
| **A1** | Setelah 2–4 minggu data klaim nyata | OCR sebagai pemeriksa silang (cocok dengan isian = otomatis). Anggota dengan 3 klaim bersih langsung otomatis. Jeda tebus 24 jam untuk akun baru | Klaim yang OCR-nya tidak cocok, verifikasi WA |
| **A2** | Saat anggota sudah ratusan dan biaya terukur | Payment gateway (konfirmasi bayar otomatis), kampanye/notifikasi WhatsApp otomatis selain OTP login | Hanya anomali |
| **A3** | Setelah A2 stabil | Laporan mingguan otomatis, pembekuan otomatis untuk pola mencurigakan | Pemilik memantau dan memutuskan hal strategis |

Syarat naik tahap ditetapkan dari data, misalnya persentase klaim yang ditolak, hasil audit sampel, dan jumlah kecurangan yang ditemukan. Ambang angkanya diputuskan setelah ada data nyata.

### 19.2 Pengaman agar tetap tenang

| Pengaman | Cara kerja |
| --- | --- |
| **Kuota hadiah** | Batas botol gratis yang bisa ditebus per hari dan per minggu (diatur di admin). Melewati batas: tebus ditunda dan peringatan dikirim |
| **Jeda tebus 24 jam** | Berlaku untuk akun baru atau stamp yang naik terlalu cepat. Memberi waktu bagi sistem dan pemilik untuk menangkap kecurangan sebelum rugi |
| **Audit sampling** | Sistem memilih acak sekitar 10% klaim yang sudah disetujui otomatis untuk dicek belakangan di antrean audit. Pelanggan tidak menunggu. Klaim yang ternyata tidak sah dibatalkan lewat ledger penyeimbang |
| **Saklar darurat** | Dua tombol di admin: “Jeda auto-approve” (semua klaim masuk review) dan “Jeda tebus”. Bisa ditekan dari HP |
| **Deteksi anomali** | Peringatan bila klaim per jam melonjak jauh di atas biasanya, banyak klaim dari satu IP atau perangkat, banyak nomor baru berpola serupa (mis. berurutan), gambar mirip, atau tebusan melewati kuota |
| **Backup dan perawatan otomatis** | Backup harian dengan peringatan bila gagal. Halaman perawatan dan perpanjangan jendela klaim aktif sendiri saat server bermasalah |

### 19.3 Notifikasi yang hemat perhatian

Pemberitahuan memakai ntfy yang sudah ada di server, dalam tiga tingkat:

| Tingkat | Contoh | Perilaku |
| --- | --- | --- |
| Info | Ringkasan harian | Satu pesan per hari, tanpa bunyi |
| Penting | Anomali klaim, kuota hadiah hampir habis, stok kritis | Notifikasi biasa |
| Kritis | Server mati, backup gagal, dugaan kebocoran | Bunyi dan diulang sampai ditangani |

**Contoh ringkasan harian (terkirim sekali, mis. pukul 20.00):**

```
Cartive harian, 23 Okt
Klaim: 12 masuk, 10 otomatis, 1 ditolak, 1 perlu review
Hadiah ditebus: 1 (kuota 3)
Stok: Reka Classic 6, Sela Aren 2 (hampir habis)
Server: normal, backup 02:00 berhasil
Anomali: tidak ada
```

### 19.4 Beban kerja pemilik (target)

- **A0–A1:** sekitar 10–15 menit per hari untuk klaim yang ragu, stok, dan konfirmasi bayar.
- **A2:** sekitar 15 menit per minggu untuk laporan dan antrean audit.
- Angka ini target rancangan, diukur dan disesuaikan setelah MVP berjalan.

### 19.5 Batas yang sebaiknya tetap manusia

Perubahan aturan program dan harga, penanganan insiden data pribadi, pemblokiran permanen akun, dan balasan komplain pelanggan (boleh dibantu template). Semua itu berdampak pada kepercayaan, bukan sekadar hitungan.

### 19.6 Perubahan terhadap bagian lain dokumen

| Bagian | Perubahan |
| --- | --- |
| 6.4 butir 5 | **Diganti:** akun baru yang mendekati reward ke-7 tidak lagi wajib review. Gantinya jeda tebus 24 jam + tanda untuk audit |
| 4.4 BR-08 | Tetap berlaku; verifikasi nomor menggunakan OTP WhatsApp Cloud API |
| Pengaturan admin | Tambahan: kuota hadiah, ambang anomali, saklar jeda |
| Backlog | Tambahan di bawah |

**Backlog tambahan**

| ID | Item | Prioritas | Jam | Tahap |
| --- | --- | --- | --- | --- |
| B26 | Kuota hadiah + saklar darurat (jeda auto-approve dan jeda tebus) | Must | 6 | M4 |
| B27 | Audit sampling dan antrean audit | Must | 4 | M3–M4 |
| B28 | Deteksi anomali + notifikasi ntfy tiga tingkat | Must | 8 | M5 |
| B29 | Ringkasan harian otomatis | Should | 4 | M5 |
| B30 | Tingkat kepercayaan anggota (3 klaim bersih = otomatis) | Should | 4 | A1 |
| B31 | Laporan mingguan otomatis | Could | 4 | A3 |

B26–B29 menambah sekitar **22 jam** ke MVP-1, sehingga totalnya menjadi ≈ 108–136 jam. Pada kapasitas 10 jam per minggu, itu menambah sekitar 2 minggu.

---

## Lampiran A. Analisis Contoh Struk & Skema Cocokkan Laporan Merchant

Lampiran ini khusus untuk website Cartive dan toko Cartive di platform. Dasarnya adalah contoh struk ShopeeFood, GrabFood, dan GoFood yang dikumpulkan dari internet. Polanya masih **dugaan awal** karena contohnya sedikit dan sebagian buram. Semua pola harus dikonfirmasi dengan struk dan laporan dari akun merchant Cartive sendiri.

### A.1 Temuan utama

1. **Nomor pendek bukan ID unik.** `#82` atau `#108` (ShopeeFood) dan `GF-717` atau `GF-061` (GrabFood) adalah nomor antrean harian per toko dan berulang. Tidak boleh diterima sebagai order ID.
2. **ID unik berbeda tiap platform** dan tidak selalu tercetak di struk thermal (struk Grab hanya menampilkan `GF-xxx`).
3. **Format tanggal tidak seragam**, sering tanpa tahun, dan bisa berbahasa Indonesia atau Inggris. Grab juga punya format struk lama dan baru.
4. **Sebagian besar contoh adalah struk sisi merchant atau driver.** Yang dimiliki pelanggan adalah tampilan aplikasi atau email, sehingga contoh sisi pelanggan harus dikumpulkan sendiri (A.7).
5. **Cartive sendiri adalah merchant**, jadi punya daftar order asli. Itu membuka cara validasi yang jauh lebih kuat daripada hanya membaca screenshot (A.5).

### A.2 Pola ID awal (isi awal tabel `PlatformRule`)

| Platform | Yang dipakai | Pola awal | Catatan |
| --- | --- | --- | --- |
| ShopeeFood | Nomor Pesanan | `^[0-9]{16,20}$` | Contoh terbaca 18–20 digit. Dilonggarkan sampai ada data lebih banyak |
| GoFood | ID pesanan / No. pesanan | `^F-[0-9]{10,14}$` | Bisa terpotong ke baris kedua di struk kertas, jadi sambungkan dulu sebelum dicek |
| GrabFood | Pesanan ID (aplikasi atau e-receipt) | `^A-[A-Z0-9]{12}$` | Struk thermal hanya `GF-xxx`, pelanggan harus mengambil ID dari aplikasi atau email |
| Semua | Kode antrean | `^(#[0-9]{1,4}\|GF-[0-9]{1,5})$` | **Ditolak dengan pesan khusus** (A.4) |

Kata kunci toko untuk pencocokan: **Cartive**. Nama toko di semua platform harus sama persis supaya pemeriksaan nama merchant konsisten.

### A.3 Parser tanggal multi-format

| Sumber | Contoh | Catatan |
| --- | --- | --- |
| ShopeeFood | `29/09/2025 20:47` | Format tetap, ada tahun |
| GoFood struk | `21:50, 08 Jul` | Tanpa tahun |
| GoFood POS / e-receipt | `Sep 21, 2025 11:37 AM`, `Rabu, 29 Juni 2022` | Bahasa dan urutan berbeda |
| GrabFood struk | `Dipesan pada 16:57, Kam 18 Sep` / `Ordered at 11:33, Wed 7 Jul` | Tanpa tahun, Indonesia atau Inggris |
| Grab e-receipt | `28 Des 2023 13:45 +0700` | Ada zona waktu |

Aturan:

1. Nama bulan dan hari dikenali dalam Indonesia dan Inggris (Mei/May, Agu/Aug, Okt/Oct, Des/Dec, dan seterusnya).
2. Zona waktu bawaan Asia/Jakarta.
3. Tanpa tahun: pakai tahun berjalan. Bila hasilnya lebih dari 1 hari di masa depan, mundurkan 1 tahun.
4. Bila ada nama hari (Kam, Wed), pilih tahun yang hari-dalam-minggunya cocok.
5. Tanggal yang tidak bisa dibaca masuk `needs_review`, bukan ditolak.

### A.4 Kode antrean dan pesan ke pelanggan

Bila isian cocok dengan pola kode antrean, tolak dengan kode galat `SHORT_CODE` dan pesan: *“Itu nomor antrean toko, bukan ID pesanan. Cari ID pesanan di aplikasi atau email konfirmasi.”* Tampilkan gambar petunjuk letak ID untuk tiap platform, setelah contoh sisi pelanggan terkumpul.

### A.5 Skema cocokkan laporan merchant

**Konsep.** Cartive mengunggah laporan pesanan dari portal merchant tiap platform ke admin. Sistem mencocokkan klaim pelanggan dengan data itu. Klaim yang cocok disetujui otomatis dengan jumlah botol dari laporan (pelanggan tidak bisa menambah jumlah). Klaim yang tidak ada di laporan tidak mungkin sah.

**Alur**

1. Pelanggan mengirim klaim (platform, order ID, jumlah botol, foto struk).
2. Sistem mencari pasangan (platform, order ID) di data laporan.
3. **Ketemu dan statusnya selesai:** klaim disetujui, stamp sesuai botol Cartive di laporan.
4. **Belum ada di laporan:** status `WAITING_REPORT`. Stamp tampil sebagai “menunggu verifikasi” dan belum bisa ditebus.
5. **Laporan baru diunggah:** semua klaim `WAITING_REPORT` dicocokkan ulang secara otomatis.
6. **Tidak ketemu setelah batas waktu (mis. 7 hari sejak laporan yang mencakup tanggalnya masuk):** ditolak dengan pesan *“Order ID tidak ditemukan di data toko.”*
7. **Pesanan dibatalkan atau dikembalikan di laporan:** stamp dibatalkan lewat ledger penyeimbang.

**Data yang diimpor (minimal)** Order ID, waktu order, baris item (untuk menghitung botol Cartive), dan status pesanan. **Nama pelanggan, nomor telepon, dan alamat tidak disimpan** (prinsip data minimal UU PDP).

**Pemetaan nama item.** Daftar alias nama produk di pengaturan admin (mis. Reka Classic, Sela Aren Karamel dan variasinya) dipakai untuk menghitung botol per baris laporan.

**Tambahan skema (Prisma)**

```prisma
// tambahkan nilai pada enum yang ada
enum ClaimStatus { PENDING AUTO_APPROVED NEEDS_REVIEW APPROVED REJECTED WAITING_REPORT }

model MerchantOrder {
  id          String   @id @default(cuid())
  platform    Platform
  orderId     String
  orderedAt   DateTime
  bottleCount Int
  status      String
  importId    String
  createdAt   DateTime @default(now())
  @@unique([platform, orderId])
  @@index([orderedAt])
}

model ReportImport {
  id          String   @id @default(cuid())
  platform    Platform
  filename    String
  rowsRead    Int
  rowsAdded   Int
  rowsSkipped Int
  importedBy  String
  createdAt   DateTime @default(now())
}
```

Pada `PlatformRule` tambahkan kolom `shortCodePattern` (teks) dan `dateFormats` (JSON).

**API tambahan (admin)**

| Metode | Path | Fungsi |
| --- | --- | --- |
| POST | `/admin/reports/import` | Unggah laporan (CSV atau XLSX) per platform, pemetaan kolom dari konfigurasi |
| GET | `/admin/reports` | Riwayat impor dan jumlah baris |
| POST | `/admin/reports/rematch` | Cocokkan ulang klaim yang menunggu |

**Kasus tepi:** laporan yang diunggah dua kali (dilewati oleh kunci unik), baris tanpa ID (dicatat sebagai dilewati), perubahan format kolom oleh platform (impor ditolak dengan pesan jelas, bukan data salah masuk), dan klaim yang masuk sebelum pesanan tampil di laporan.

### A.6 Uji kelayakan laporan merchant (dikerjakan pemilik sebelum membangun)

Periksa di akun merchant tiap platform, lalu isi tabel ini.

| Pertanyaan | ShopeeFood | GoFood | GrabFood |
| --- | --- | --- | --- |
| Laporan pesanan bisa diekspor (CSV, XLSX, PDF)? |  |  |  |
| Memuat nomor pesanan yang sama dengan yang dilihat pelanggan? |  |  |  |
| Memuat baris item, atau hanya total? |  |  |  |
| Seberapa cepat pesanan muncul (langsung, besok, mingguan)? |  |  |  |
| Bisa dijadwalkan dikirim ke email? |  |  |  |
| Menyertakan pesanan yang dibatalkan beserta statusnya? |  |  |  |

**Keputusan**

- Semua “ya”: laporan menjadi sumber kebenaran utama, struk jadi cadangan.
- Sebagian “ya”: mode campuran. Platform yang laporannya layak dicocokkan otomatis, sisanya lewat aturan struk (bagian 6.4).
- Semua “tidak”: tetap mode struk dengan audit sampling (bagian 19), dan OCR dipakai sebagai pemeriksa silang.

### A.7 Data uji dan privasi

- **Jangan menyimpan struk asli orang lain** (nama, nomor, alamat) di repositori atau data uji. Contoh dari internet hanya dipakai untuk membaca pola.
- Buat **struk sintetis** (kira-kira 30 per platform) dengan variasi format, foto miring, buram, dan silau.
- Kumpulkan **contoh sisi pelanggan** dengan memesan sendiri satu kali di tiap platform (sekitar 3 botol) lalu screenshot tampilan aplikasi dan email. Samarkan data pribadi sebelum disimpan.
- Struk yang bukan pesanan makanan (mis. pembelian atribut driver) diabaikan.
- Beberapa merchant lain terlihat menaruh QR ajakan komunitas WhatsApp di struk pesanan platform. Itu menunjukkan praktik yang umum, tetapi bukan jaminan aman terhadap T&C. Tetap baca T&C (bagian 2.3).

### A.8 Perubahan pada bagian lain dan backlog

| Bagian | Perubahan |
| --- | --- |
| 6.4 | Tambah langkah 0: tolak kode antrean (`SHORT_CODE`). Pemeriksaan format memakai tabel A.2. Tanggal memakai parser A.3 |
| 6.1 / form klaim | Tambah isian **Jumlah botol Cartive** (1–6). Nilai resmi diambil dari laporan bila tersedia |
| 6.6 | Tambah pesan `SHORT_CODE` dan `NOT_IN_REPORT` |
| 10.1 | Tambah `WAITING_REPORT`, `MerchantOrder`, `ReportImport`, dan kolom baru `PlatformRule` |
| 11.3 | Tambah kode galat `SHORT_CODE` dan `NOT_IN_REPORT` |
| 19.1 | Tahap A1 dapat dimajukan bila uji kelayakan (A.6) berhasil. OCR (B23) tidak lagi dibutuhkan |

**Backlog tambahan**

| ID | Item | Prioritas | Jam | Tahap |
| --- | --- | --- | --- | --- |
| B32 | Uji kelayakan laporan merchant (A.6), pekerjaan pemilik tanpa kode | Must | 2 | Sebelum M2 |
| B33 | Model `MerchantOrder`, impor CSV/XLSX, pemetaan kolom | Should | 10 | A1 |
| B34 | Mesin cocokkan, status `WAITING_REPORT`, cocokkan ulang otomatis | Should | 8 | A1 |
| B35 | Parser tanggal multi-format (A.3) | Must | 6 | M2 |
| B36 | Deteksi kode antrean dan pesan khusus | Must | 2 | M2 |
| B37 | Struk sintetis + tes untuk parser dan pola ID | Must | 6 | M2–M5 |

B35–B37 menambah sekitar **14 jam** ke MVP-1, sehingga totalnya menjadi ≈ 122–150 jam. B33–B34 (18 jam) masuk tahap A1 dan menggantikan OCR (B23, 12 jam) bila hasil A.6 baik.
