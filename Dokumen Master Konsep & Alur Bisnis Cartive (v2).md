# Dokumen Master Konsep & Alur Bisnis "Cartive"

*Versi 2.0 (draft) · 23 Oktober 2026 · Wave Projects Center.ID*

> **Catatan angka:** biaya bahan memakai harga keranjang pada screenshot. Komisi platform berasal dari informasi publik 2026 dan bersifat estimasi (bisa beda per kota, kategori, dan promo). Cocokkan dengan laporan penyelesaian di aplikasi merchant sebelum dipakai mengambil keputusan.

## Ringkasan Eksekutif

Cartive adalah brand kopi Ready-to-Drink botol 250 ml yang diproduksi rumahan, dijual di GoFood, GrabFood, ShopeeFood, dan di website sendiri. Website berfungsi ganda: **program loyalty (stamp)** yang berlaku untuk pembelian di mana pun, dan **toko langsung** dengan margin lebih besar.

Temuan utama dokumen ini:

1. Potongan platform efektif sekitar 22–33% dari harga jual. Pada harga Rp10.000, laba kotor per botol hanya sekitar Rp1.700–2.700.
2. Penjualan lewat web memberi laba sekitar Rp4.900 per botol (belum ongkir), hampir 2–3 kali lipat platform. Inilah alasan bisnis dari jembatan QR.
3. Dengan resep sekarang, 3 varian Sela melewati target HPP Rp5.000. Opsi perbaikan ada di bagian 1.5.
4. Reward loyalty dirancang hanya bisa ditebus di web, supaya pelanggan platform punya alasan nyata untuk pindah saluran.
5. Validasi klaim dimulai dari aturan + review manual. OCR hanya pembantu, bukan penentu.

---

## I. Perencanaan Produk & Operasional F&B

### 1.1 Model & Brand

- **Model:** kopi RTD rumahan, dijual lewat online food delivery dan website sendiri.
- **Brand:** Cartive, plesetan dari "kreatif" (bahan bakar bagi developer, programmer, mekanik, editor, dan kreator).
- **Kemasan:** botol 250 ml, isi 230–240 g (tanpa es batu di dalam botol), disimpan dingin di kulkas showcase. Jenis botol (PET atau kaca) dan tutup dipilih setelah uji kebocoran dan umur simpan.
- **Target HPP:** di bawah Rp5.000 per botol.
- **Harga jual:** Rp10.000 di web. Di aplikasi platform disarankan Rp12.000 (alasan di 1.6).
- **Catatan positioning:** pembeli di platform adalah publik umum, bukan hanya komunitas kreator. Cerita brand disampaikan lewat nama varian, foto menu, dan stiker, bukan mengandalkan pembeli sudah paham.

### 1.2 Matriks Resep (per botol 250 ml)

Semua takaran distandarkan ke gram dan ml. Versi sebelumnya memakai sachet dan setengah sachet, yang tidak konsisten dengan matriks gram.

| Varian | Nescafe Classic | Nescafe Ice Roast | Carnation SKM | Gula Aren | Kecap Bango |
| --- | --- | --- | --- | --- | --- |
| **Reka Classic** (master) | 2 g | 1 g | 20 g | 0 | 2–3 tetes |
| **Reka Double Shot** | 4 g | 0 | 20 g | 0 | 3 tetes |
| **Reka Black Aren** | 2,5 g | 0 | 0 | 10 ml | 1 tetes |
| **Sela Aren Karamel** (master) | 2 g | 0 | 20 g | 15 ml | 1–2 tetes |
| **Sela Ice Creamy** | 0 | 3 g | 30 g | 0 | 1 tetes |
| **Sela Aren Bold** | 2 g | 1 g | 25 g | 10 ml | 2 tetes |

**Karakter lini:**

- **Reka (The Bold & Focus Fuel):** pahit pekat, body kuat, gurih tipis, rendah manis.
- **Sela (The Smooth & Sweet Break):** creamy, manis karamel aren yang pas, lembut di tenggorokan.

**Catatan penting:** satu sachet Nescafe Ice Roast = 2 g (kemasan 2 g × 10). Jadi "3 g" pada Sela Ice Creamy setara 1,5 sachet. Selalu timbang gram, jangan hitung sachet.

### 1.3 SOP Racik (timbangan digital + hand frother)

1. Taruh gelas ukur di atas timbangan, tekan TARE (0 g).
2. Masukkan kopi, SKM, gula aren, dan tetes kecap sesuai resep.
3. Tuang 50 ml air panas, aduk dengan frother 5–10 detik sampai larut dan sedikit berbusa.
4. Tambahkan air dingin langsung di atas timbangan sampai total 230–240 g.
5. Aduk sekali lagi, tuang ke botol bersih, tutup rapat, langsung masuk kulkas.
6. Tempel stiker produk + stiker QR, isi tanggal produksi dan batas konsumsi.

**Kontrol kualitas:** botol dan tutup dicuci lalu disanitasi air panas, alat racik dibersihkan tiap batch, suhu kulkas dijaga dingin konsisten (sekitar 5 °C atau lebih rendah), dan satu botol per batch dicicip sebagai sampel pembanding.

### 1.4 Umur Simpan & Keamanan Pangan

Kopi campur susu tanpa pengawet dan tanpa pasteurisasi industri mudah rusak. Langkah yang disarankan:

- Uji umur simpan sendiri: simpan botol sampel di kulkas, cek bau, rasa, kekeruhan, dan tutup pada jam ke-24, 48, dan 72. Hasilnya menjadi angka batas konsumsi di stiker.
- Cantumkan di stiker: tanggal produksi, batas konsumsi, "Simpan dingin", dan alergen (**susu**, **kedelai dan gandum** dari kecap).
- Hindari mengisi botol dalam keadaan hangat dan menyisakan banyak ruang udara.

### 1.5 Perhitungan HPP (target di bawah Rp5.000)

Harga satuan dari keranjang: Nescafe Classic ±Rp500/g (twinpack 2 × 200 g, antara harga biasa dan harga live), Nescafe Ice Roast Rp1.480/sachet 2 g (±Rp740/g), SKM Carnation ±Rp41/g, Gulare ±Rp90/ml, kecap Bango ±Rp56/g (hampir nol per botol). Kemasan dan utilitas diasumsikan ±Rp2.000 per botol (botol, tutup, stiker produk, stiker QR, listrik kulkas dan air). **Ganti dengan harga asli supplier saat sudah ada.**

| Varian | Bahan | Kemasan + utilitas | Total HPP | vs target Rp5.000 |
| --- | --- | --- | --- | --- |
| Reka Classic | ±Rp2.590 | ±Rp2.000 | **±Rp4.590** | Aman |
| Reka Double Shot | ±Rp2.850 | ±Rp2.000 | **±Rp4.850** | Aman, tipis |
| Reka Black Aren | ±Rp2.165 | ±Rp2.000 | **±Rp4.165** | Aman |
| Sela Aren Karamel | ±Rp3.200 | ±Rp2.000 | **±Rp5.200** | Lewat sedikit |
| Sela Ice Creamy | ±Rp3.470 | ±Rp2.000 | **±Rp5.470** | Lewat |
| Sela Aren Bold | ±Rp3.700 | ±Rp2.000 | **±Rp5.700** | Lewat |

**Pendorong biaya terbesar:** Nescafe Ice Roast (±Rp740/g, sekitar 1,5 kali lebih mahal dari Classic) dan gula aren sirup.

**Opsi perbaikan (pilih satu atau gabungkan):**

- Kurangi atau ganti porsi Nescafe Ice pada varian Sela (mis. Classic 1,5 g + Ice 1 g), lalu uji ulang rasa.
- Beli botol dan tutup grosir untuk menurunkan kemasan ke ±Rp1.500.
- Naikkan harga varian Sela Rp1.000 dari varian Reka (alasan: lebih banyak SKM dan aren).
- Jadikan varian di atas Rp5.000 sebagai menu terbatas, bukan menu utama.

### 1.6 Harga & Margin per Saluran

Asumsi potongan platform (estimasi publik 2026):

- **GoFood:** komisi 20% + biaya transaksi Rp1.000 per pesanan + PPN 12% atas komisi.
- **GrabFood:** sekitar 25–30% (skenario ini memakai 30%, umumnya sudah termasuk PPN).
- **ShopeeFood:** sekitar 20% + PPN atas komisi. Biaya tetap dan promo yang ditanggung merchant belum terkonfirmasi, jadi cek di aplikasi.
- **PPh Final UMKM 0,5% dari omzet bruto** (kewajiban merchant sendiri, bukan dipotong platform). Ada fasilitas omzet tidak kena pajak pada batas tertentu; konfirmasi ke KPP atau konsultan pajak.
- HPP dihitung Rp5.000 (batas target).

**Skenario A: harga aplikasi Rp10.000**

| Saluran | Potongan platform | Bersih diterima | Setelah PPh 0,5% | Laba kotor per botol |
| --- | --- | --- | --- | --- |
| GoFood | ±Rp3.240 (32%) | ±Rp6.760 | ±Rp6.710 | **±Rp1.710** |
| GrabFood | ±Rp3.000 (30%) | ±Rp7.000 | ±Rp6.950 | **±Rp1.950** |
| ShopeeFood | ±Rp2.240 (22%) | ±Rp7.760 | ±Rp7.710 | **±Rp2.710** |
| Web (QRIS) | ±Rp70 | ±Rp9.930 | ±Rp9.880 | **±Rp4.880** (belum ongkir) |

**Skenario B: harga aplikasi Rp12.000 (harga web tetap Rp10.000)**

| Saluran | Potongan platform | Bersih diterima | Setelah PPh 0,5% | Laba kotor per botol |
| --- | --- | --- | --- | --- |
| GoFood | ±Rp3.690 | ±Rp8.310 | ±Rp8.250 | **±Rp3.250** |
| GrabFood | ±Rp3.600 | ±Rp8.400 | ±Rp8.340 | **±Rp3.340** |
| ShopeeFood | ±Rp2.690 | ±Rp9.310 | ±Rp9.250 | **±Rp4.250** |

**Kesimpulan:** menaikkan harga aplikasi ke Rp12.000 menutup sebagian besar potongan. Harga merchant di aplikasi memang boleh ditentukan sendiri dan umum dibedakan dari harga saluran lain. Cek T&C platform soal aturan kesetaraan harga.

**Biaya web (di luar HPP):**

- Payment gateway: QRIS sekitar 0–0,7%. Virtual account dan e-wallet biasanya dikenai biaya lebih besar (cek tarif Midtrans, Xendit, atau Duitku saat memilih).
- Ongkir: instant courier (mis. Gojek/Grab) biasanya puluhan ribu rupiah per pengiriman, jadi untuk 1 botol tidak masuk akal. Pembeli menanggung ongkir. Solusi: minimal order 3 botol, **ambil sendiri gratis**, atau radius antar dekat.
- PPN: tidak berlaku selama belum PKP.

---

## II. Masalah Platform Pihak Ketiga & Solusi Ekosistem D2C

### 2.1 Pain Point

1. **Potongan besar:** efektif 22–33% dari harga jual (komisi, biaya tetap per pesanan, PPN atas komisi), belum termasuk diskon yang ditanggung merchant.
2. **Tidak ada retensi:** alur platform berhenti di *customer pesan, penjual terima, kurir jemput, diantar, selesai*. Penjual tidak punya akses data pelanggan, tidak bisa mengirim feedback atau promo, dan tidak bisa mendorong repeat order.

### 2.2 Solusi: "Bridge to Web" lewat QR Code

Setiap botol yang dikirim ditempeli **stiker QR statis**. Stiker memuat ajakan seperti "Scan, kumpulkan stamp, tukar gratis 1 botol". Pelanggan scan setelah botol sampai, masuk ke web Cartive, lalu mengklaim stamp. Hadiah hanya bisa ditebus di web.

### 2.3 Kepatuhan terhadap Aturan Platform (wajib dicek)

Banyak platform food delivery melarang merchant mengarahkan transaksi ke luar aplikasi. Mitigasi:

- Posisikan QR sebagai **program loyalty / klaim reward**, bukan ajakan "beli di sini lebih murah" atau "pesan langsung".
- Jangan menyebut nama platform atau perbandingan harga di stiker.
- Baca dan simpan salinan T&C merchant ketiga platform. Catat pasal tentang transaksi di luar platform, promosi silang, dan penggunaan data pelanggan.
- Mulai dengan satu platform dulu agar risiko suspend tidak menyentuh seluruh penjualan.

---

## III. Skema Loyalty: "Cartive Fuel Card"

### 3.1 Prinsip

- Satu sistem stamp untuk semua saluran pembelian.
- Pembelian di web lebih menguntungkan pelanggan: stamp lebih banyak dan reward hanya ditebus di web.
- Biaya reward kecil dan terukur (maksimum sekitar 12% dari nilai belanja).
- Tanpa password. Identitas pelanggan adalah nomor WhatsApp yang diverifikasi.

### 3.2 Aturan

| Komponen | Aturan |
| --- | --- |
| Pembelian di platform | Klaim lewat order ID + foto struk. **1 stamp per botol Cartive** dalam struk |
| Pembelian di web | Stamp otomatis saat bayar sukses. **2 stamp per botol** (bonus saluran langsung) |
| Reward utama | **7 stamp = 1 botol gratis** (varian apa saja, ditebus di web) |
| Reward awal | 3 stamp = voucher Rp2.000 untuk order web berikutnya (agar pelanggan cepat merasakan hasil) |
| Penebusan | Hanya di web: ambil sendiri atau antar dengan ongkir ditanggung pembeli |
| Kedaluwarsa | Stamp hangus 90 hari setelah aktivitas terakhir |
| Batas klaim | Struk maksimal 48 jam setelah order, maksimal 5 klaim per nomor per hari |
| Satu order ID | Hanya satu kali klaim, seumur hidup |

**Biaya reward:** 7 botol platform (±Rp70.000 omzet) menghasilkan 1 botol gratis (HPP ±Rp5.000, kurang dari 8% omzet). Pelanggan web yang membeli 4 botol sudah mencapai reward, yang cukup menarik tanpa membuat margin habis.

### 3.3 Alur Pelanggan

1. Botol sampai. Pelanggan scan QR di stiker.
2. Landing page Cartive: masukkan nomor WhatsApp.
3. Verifikasi nomor (lihat bagian V).
4. Dashboard Fuel Card: jumlah stamp, progres ke reward.
5. Klaim stamp: pilih platform, isi order ID, unggah foto atau screenshot struk.
6. Sistem memvalidasi (bagian IV.5). Hasil: disetujui otomatis, perlu review, atau ditolak dengan alasan.
7. Stamp bertambah. Notifikasi tampil di web (dan WhatsApp bila diaktifkan).
8. Saat stamp cukup, tombol tebus muncul di web.

Pelanggan yang belanja langsung: pilih menu, bayar (QRIS), pilih ambil atau antar, lalu stamp otomatis masuk.

---

## IV. Solusi atas Tantangan Teknis dari Catatan

### IV.1 Apakah QR statis aman?

Aman. QR statis hanya pintu masuk ke web yang sama untuk semua botol. Pengamanan bukan di QR, melainkan di **order ID yang unik per saluran**. Tidak perlu QR unik per botol, yang menambah biaya cetak tanpa menambah keamanan berarti.

### IV.2 Nominal pesanan dan nominal bayar berbeda

Total bayar di struk bercampur ongkir, diskon, voucher, dan biaya layanan, sehingga **jangan dipakai sebagai kunci validasi**. Yang divalidasi:

- Nama merchant mengandung "Cartive".
- Item dan jumlah botol Cartive (menentukan jumlah stamp).
- Tanggal dan jam order.
- Order ID.

Nominal hanya dicatat sebagai data analitik, bukan syarat.

### IV.3 API online shop atau payment gateway?

Dua hal ini berbeda fungsi:

- **API order dari platform food delivery:** umumnya hanya tersedia untuk mitra enterprise atau integrasi POS, bukan untuk merchant kecil. Untuk skala awal, anggap **tidak tersedia**. Verifikasi pembelian dilakukan lewat struk. (Konfirmasi ke dukungan merchant masing-masing; kalau ada, itu menggantikan OCR.)
- **Payment gateway:** hanya untuk pembayaran order di web Cartive sendiri.

**Keputusan bertahap untuk pembayaran web:**

| Fase | Cara bayar | Alasan |
| --- | --- | --- |
| MVP | QRIS statis + konfirmasi bukti bayar manual via WhatsApp | Nol biaya integrasi, cukup untuk puluhan order |
| Setelah order rutin | Payment gateway (QRIS dinamis, e-wallet, VA) | Konfirmasi otomatis, tidak ada kerja manual |

### IV.4 Satu sistem untuk dua saluran

Semua stamp dicatat sebagai **ledger** (tabel kejadian: tambah, tukar, hangus), bukan satu angka saldo yang ditimpa. Dengan begitu riwayat bisa diaudit, klaim bermasalah bisa dibatalkan, dan tidak ada saldo yang salah akibat dua proses berjalan bersamaan.

### IV.5 Validasi dan Anti-Fraud

Screenshot mudah diedit dan format struk tiap platform berbeda, sehingga OCR saja tidak cukup. Rancangan berlapis:

1. **Batasan keras:** `UNIQUE (platform, order_id)`. Order ID disimpan bersama kode platform karena format antar platform bisa bentrok. Order ID yang sama ditolak ("Order ID sudah diklaim").
2. **Aturan:** nama merchant cocok, item Cartive ada, tanggal order maksimal 48 jam, format order ID sesuai pola platform.
3. **Deteksi duplikat gambar:** simpan hash gambar (perceptual hash) untuk menangkap foto yang sama dengan order ID diubah.
4. **Rate limit:** per nomor, per perangkat, dan per IP.
5. **Antrean review:** klaim yang ragu (OCR tidak yakin, nilai di luar pola) masuk ke halaman admin untuk disetujui manual.
6. **OCR sebagai pembantu:** pelanggan mengetik order ID sendiri, OCR mencocokkan sebagai pemeriksa silang. OCR dijalankan di server agar hasil konsisten (bukan di browser pelanggan).

Karena hadiah awal hanya stamp, toleransi fraud boleh cukup tinggi. Pengetatan ditambah di sekitar reward besar: reward ke-7 bisa memicu review manual untuk akun baru.

### IV.6 Privasi struk

Struk memuat nama, nomor telepon, dan alamat pembeli. Ekstrak hanya data yang diperlukan, simpan gambar maksimal 30 hari untuk keperluan sengketa, lalu hapus. Tampilkan persetujuan jelas sebelum unggah.

### IV.7 Skema database inti

| Tabel | Kolom utama |
| --- | --- |
| members | id, wa\_number (format E.164, unik), wa\_verified\_at, consent\_marketing, consent\_at, created\_at |
| claims | id, member\_id, platform, order\_id, status (auto\_approved / needs\_review / rejected), stamps\_awarded, image\_hash, ocr\_json, created\_at. Kunci unik pada (platform, order\_id) |
| stamp\_ledger | id, member\_id, delta (+/-), reason (claim / web\_order / redeem / expire), ref\_id, created\_at |
| rewards | id, member\_id, type, status (available / redeemed / expired), expires\_at |
| web\_orders & web\_order\_items | id, member\_id, items, subtotal, ongkir, payment\_status, fulfillment (pickup / delivery), created\_at |
| audit\_log | id, actor, action, detail, created\_at |

---

## V. Peran WhatsApp dalam Sistem

### 5.1 Penjelasan Singkat

Nomor WhatsApp dipakai karena hampir semua pelanggan Indonesia punya, aktif dibaca, dan tidak perlu membuat password. WhatsApp punya **empat peran** dalam sistem Cartive:

| Peran | Fungsi | Jenis pesan |
| --- | --- | --- |
| 1. Identitas | Nomor WA menjadi Member ID | OTP / verifikasi |
| 2. Notifikasi transaksi | Stamp ditambahkan, reward siap, status order web | Transaksional |
| 3. Promosi | Voucher, varian baru, promo berkala | Marketing (wajib opt-in) |
| 4. Layanan | Tanya jawab, konfirmasi bayar manual, komplain | Percakapan |

### 5.2 Mengapa verifikasi perlu

Tanpa verifikasi, siapa pun bisa mengetik nomor orang lain, melihat atau mengklaim stamp-nya, dan membuat Cartive mengirim promo ke orang yang tidak setuju. Verifikasi memastikan nomor memang milik orang yang mengklaim.

### 5.3 Tiga cara mengimplementasikan

| Opsi | Cara | Biaya | Catatan |
| --- | --- | --- | --- |
| A. WhatsApp Business App | Tombol *wa.me* dengan teks terisi otomatis (mis. kode verifikasi). Pelanggan mengirim pesan ke nomor Cartive | Gratis | Verifikasi dilakukan manual atau semi-manual. Cocok untuk MVP |
| B. WhatsApp Business API resmi (via BSP) | OTP, notifikasi, dan broadcast otomatis | Per pesan, plus biaya langganan BSP | Cocok bila member sudah ratusan |
| C. Gateway tidak resmi | Otomatisasi lewat sesi WA Web | Murah | **Hindari.** Risiko nomor diblokir, apalagi nomor yang dipakai berjualan |

**Rekomendasi:** mulai dari **opsi A**. Pelanggan menekan tombol di web, WhatsApp terbuka dengan teks "VERIF-XXXX" terisi, lalu pelanggan mengirimnya. Pesan masuk dari pelanggan menandakan nomor itu milik mereka dan tidak menimbulkan biaya pesan keluar. Naik ke opsi B setelah volume membenarkan.

### 5.4 Perkiraan biaya opsi B (tarif Meta untuk Indonesia, berlaku sejak 1 Oktober 2026)

Sumber publik menyebut kisaran: marketing sekitar Rp590–640 per pesan, utility dan authentication sekitar Rp360–390 per pesan (cek PPN dan tarif BSP saat berlangganan; angka berbeda antar penyedia).

Contoh 200 member aktif per bulan: verifikasi (200 × ±Rp360) ≈ Rp72.000, notifikasi stamp (±600 pesan × ±Rp360) ≈ Rp216.000, 2 broadcast promo (400 × ±Rp590) ≈ Rp236.000. Total sekitar **Rp520.000 per bulan** di luar langganan BSP.

**Cara menekan biaya:** tampilkan stamp di web (bukan di WhatsApp), kirim promo hanya ke segmen yang relevan, dan batasi broadcast.

### 5.5 Aturan Opt-in & Privasi

- Persetujuan terpisah untuk pesan promosi (kotak centang, tidak diisi otomatis).
- Setiap promo menyediakan cara berhenti (balas "STOP").
- Halaman Kebijakan Privasi: data apa yang disimpan, untuk apa, berapa lama, dan cara menghapus (mengacu pada UU Pelindungan Data Pribadi).
- Nomor WA tidak dibagikan ke pihak lain.

---

## VI. Legalitas & Kepatuhan (checklist)

| Hal | Tindakan |
| --- | --- |
| Izin edar pangan | Tanyakan ke Dinas Kesehatan setempat apakah minuman kopi campur susu bisa memakai PIRT, atau perlu izin lain |
| NIB | Daftar lewat OSS (umumnya diminta platform saat pendaftaran merchant) |
| Halal | Siapkan pernyataan halal (self-declare) atau sertifikasi sesuai ketentuan yang berlaku |
| Label | Nama produk, komposisi, alergen, berat bersih, tanggal produksi dan batas konsumsi, nama dan alamat produsen |
| T&C platform | Baca aturan transaksi di luar platform dan penggunaan data pelanggan |
| Pajak | PPh Final UMKM 0,5% dari omzet bruto. Konfirmasi fasilitas dan kewajiban ke KPP atau konsultan pajak |
| Merek | Cek "Cartive" di pangkalan data merek DJKI sebelum cetak massal |
| Pelindungan data | Persetujuan, kebijakan privasi, retensi data struk dan nomor WA |

---

## VII. Roadmap Eksekusi (revisi)

### Fase 0: Validasi Pasar (1–2 minggu)

- Jual 20 botol ke lingkungan sekitar dan komunitas (status WhatsApp, bengkel, rekan kerja) dengan pemesanan manual.
- Catat: varian terlaris, komentar rasa, umur simpan nyata, jumlah repeat order, dan harga yang mau dibayar.
- Selesaikan uji umur simpan dan cek legalitas awal.
- Baca T&C platform dan pilih satu platform untuk dibuka lebih dulu.

### Fase 1: Web MVP (waktu menyesuaikan jadwal)

- Landing page Cartive + masuk dengan nomor WA (verifikasi opsi A).
- Dashboard stamp + form klaim (order ID + unggah struk) dengan `UNIQUE (platform, order_id)` dan antrean review manual.
- Ledger stamp dan halaman admin sederhana.
- Pembayaran web: QRIS statis + konfirmasi manual.

### Fase 2: Packaging & Material

- Putuskan resep final sesuai batas HPP (bagian 1.5).
- Cetak stiker botol (produk + QR statis + tanggal), beli botol, dan stok bahan baku (Nescafe Classic twinpack, Carnation 365 g, Gulare 1,3 kg, kecap Bango).

### Fase 3: Produksi & Go-Live

- Batch awal 20 botol (10 Sela, 10 Reka).
- Aktifkan satu platform lebih dulu, tambah platform lain setelah operasional stabil.
- Pasang harga aplikasi sesuai skenario B.

### Fase 4: Optimasi (setelah 4–8 minggu data)

- Ukur tingkat klaim stamp, tingkat repeat order, dan persentase penjualan lewat web.
- Tambah OCR sebagai pembantu validasi dan payment gateway bila volume membenarkan.
- Naik ke kampanye/broadcast WhatsApp otomatis setelah member mencapai ratusan; OTP login tetap menggunakan WhatsApp Cloud API.

**Indikator yang dipantau:** klaim per 100 botol platform (hipotesis awal 10–20%, perlu dibuktikan), repeat order 30 hari, porsi penjualan web, laba kotor per botol per saluran, dan jumlah klaim yang ditolak atau direview.

---

## VIII. Daftar Data yang Masih Perlu Diverifikasi

| # | Item | Cara memverifikasi |
| --- | --- | --- |
| 1 | Komisi dan biaya tetap tiap platform di akun sendiri | Laporan penyelesaian di aplikasi merchant |
| 2 | Aturan transaksi di luar platform | T&C merchant tiap platform |
| 3 | Ketersediaan API order untuk merchant kecil | Dukungan merchant masing-masing |
| 4 | Umur simpan nyata | Uji 24/48/72 jam |
| 5 | Harga kemasan (botol, tutup, stiker) | Penawaran supplier |
| 6 | Jenis izin pangan yang berlaku | Dinas Kesehatan setempat |
| 7 | Fasilitas dan kewajiban PPh UMKM | KPP atau konsultan pajak |
| 8 | Ketersediaan nama merek | Pangkalan data DJKI |
| 9 | Tarif ongkir dan radius antar untuk order web | Cek aplikasi kurir instan |
| 10 | Tarif WhatsApp API terbaru dan biaya BSP | Penawaran BSP resmi |
