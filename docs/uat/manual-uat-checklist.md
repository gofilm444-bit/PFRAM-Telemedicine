# Lembar Verifikasi & Checklist UAT Manual — PFRAM Telemedicine

Dokumen ini merupakan instrumen pengujian penerimaan pengguna (*User Acceptance Testing* / UAT) manual resmi untuk rilis final **PFRAM Telemedicine** (Level Standar Maksimal). Seluruh skenario disusun secara terperinci untuk menguji interaksi nyata pada ketiga antarmuka: **Aplikasi Mobile Ibu Hamil**, **Web Portal Bidan Pendamping**, dan **Web Portal Administrator**.

---

## 1. Informasi Pengujian & Akun Terverifikasi

### 1.1. Informasi Pelaksanaan
- **Tanggal Pengujian:** ____________________
- **Penguji / QA Tester:** ____________________
- **Perangkat Mobile UAT:** Android (APK `id.pfram.telemedicine` v1.0.0, versionCode 1)
- **Perangkat Web UAT:** Browser Desktop (Chrome / Firefox / Edge terbaru)
- **Lingkungan Uji:** Staging / Production Sandbox

### 1.2. Akun Demo Idempotent
| Peran | Nama Akun | Nomor HP | Kata Sandi | Catatan |
|---|---|---|---|---|
| **Admin** | Administrator Demo PFRAM | `628111111111` | `AdminDev123!` | Kelola Master Data & Penugasan |
| **Bidan** | Bidan Demo 01 (Siti Rahma, S.Tr.Keb) | `628122222222` | `MidwifeDev123!` | Puskesmas Banda Neira |
| **Bidan** | Bidan Demo 02 (Dewi Lestari, A.Md.Keb) | `6281200000002` | `MidwifeDev123!` | Posyandu Pulau Ay |
| **Bidan** | Bidan Demo 03 (Sri Handayani, S.Tr.Keb) | `6281200000003` | `MidwifeDev123!` | RSUD Dr. M. Haulussy |
| **Ibu (T1)** | Ibu Demo 01 (Siti Aminah) | `6281300000001` | `MotherDev123!` | Trimester 1 (8 Minggu) |
| **Ibu (T2)** | Ibu Demo 02 (Fatimah Zahra) | `6281300000002` | `MotherDev123!` | Trimester 2 (20 Minggu), Grafik & TTD |
| **Ibu (T3)** | Ibu Demo 03 (Ratna Dewi) | `6281300000003` | `MotherDev123!` | Trimester 3 (33 Minggu), P4K, Rujukan, Video Call |
| **Ibu (Dev)** | Ibu Development | `628133333333` | `MotherDev123!` | Akun kompatibilitas regression test |

---

## 2. Checklist UAT: Aplikasi Mobile Ibu Hamil (Mother Mobile)

### UAT-MOTH-01: Autentikasi (Login & Logout)
- **Langkah Uji:**
  1. Buka aplikasi PFRAM pada perangkat Android.
  2. Masukkan nomor HP `6281300000003` dan kata sandi `MotherDev123!`.
  3. Tekan tombol **Masuk**.
  4. Setelah berada di Beranda, buka menu **Akun / Profil** lalu tekan tombol **Keluar (Logout)**.
  5. Konfirmasi dialog keluar.
- **Hasil yang Diharapkan:**
  - Login berhasil tanpa *crash*, aplikasi mengarahkan ke halaman Beranda Ibu.
  - Sesi tersimpan aman pada penyimpanan lokal perangkat.
  - Logout berhasil membersihkan token dan mengembalikan tampilan ke layar Login.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-02: Profil Ibu Hamil
- **Langkah Uji:**
  1. Login sebagai Ibu Demo 03 (`6281300000003`).
  2. Buka tab atau menu **Profil**.
  3. Periksa informasi identitas: Nama Lengkap, Nomor HP, NIK, dan Fasilitas Kesehatan yang dipilih.
  4. Periksa informasi Bidan Pendamping yang ditugaskan.
- **Hasil yang Diharapkan:**
  - Data profil tampil lengkap sesuai master data (`Ibu Demo 03 - Trimester 3 (Ratna Dewi)`).
  - Nama dan kontak Bidan Pendamping (`Bidan Siti Rahma`) tampil jelas.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-03: Ringkasan Informasi Kehamilan
- **Langkah Uji:**
  1. Pada halaman Beranda, periksa kartu status kehamilan.
  2. Periksa usia gestasi (minggu dan hari).
  3. Periksa indikator Trimester dan Hari Perkiraan Lahir (HPL / EDD).
- **Hasil yang Diharapkan:**
  - Usia kehamilan tampil akurat (~33 minggu) dengan label **Trimester 3**.
  - Tanggal HPL terhitung otomatis secara klinis berdasarkan HPHT.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-04: Monitoring Fisik Mandiri (Berat Badan & Tekanan Darah)
- **Langkah Uji:**
  1. Buka tab **Pemantauan**.
  2. Tekan tombol **+ Catat Pengukuran**.
  3. Masukkan Berat Badan: `68.5` kg.
  4. Masukkan Tekanan Darah: Sistolik `118` mmHg, Diastolik `78` mmHg.
  5. Tambahkan keluhan/catatan: `"Kaki sedikit pegal setelah aktivitas"`.
  6. Simpan entri pemantauan.
- **Hasil yang Diharapkan:**
  - Entri berhasil disimpan dan langsung muncul pada daftar riwayat pemantauan paling atas.
  - Tensi dan BB tervalidasi sesuai rentang fisiologis normal.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-05: Grafik Tren Pemantauan Fisik
- **Langkah Uji:**
  1. Pada tab **Pemantauan**, alihkan tampilan ke tab **Grafik**.
  2. Periksa grafik garis tren Berat Badan.
  3. Periksa grafik fluktuasi Tekanan Darah (Sistolik & Diastolik).
  4. Periksa keberadaan teks *disclaimer* di bagian bawah grafik.
- **Hasil yang Diharapkan:**
  - Grafik merender titik-titik data historis secara kronologis dan responsif.
  - Teks disclaimer non-diagnostik tertera dengan jelas: *"Grafik ini bersifat edukatif dan bukan pengganti diagnosis medis dokter/bidan"*.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-06: Jadwal Pemeriksaan Kehamilan (ANC)
- **Langkah Uji:**
  1. Buka tab **ANC & Pengingat**.
  2. Periksa jadwal kunjungan ANC terdekat pada kartu utama.
  3. Periksa riwayat kunjungan ANC (K1 hingga kunjungan saat ini).
  4. Periksa indikator kewajiban pemeriksaan dokter spesialis (*Dokter Required*).
- **Hasil yang Diharapkan:**
  - Jadwal ANC berikutnya tampil dengan informasi tanggal, jam, faskes, dan jenis kunjungan.
  - Kunjungan wajib dokter (K1 dan K5) menampilkan lencana khusus penanda dokter.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-07: Pengingat & Kepatuhan Tablet Tambah Darah (TTD)
- **Langkah Uji:**
  1. Buka kartu **Kepatuhan TTD** pada tab ANC.
  2. Periksa persentase kepatuhan minum tablet tambah darah (misal >80%).
  3. Tekan tombol konfirmasi **"Saya Sudah Minum TTD Hari Ini"**.
  4. Periksa perubahan status kepatuhan dan jumlah hari berturut-turut.
- **Hasil yang Diharapkan:**
  - Konfirmasi tercatat seketika, persentase diperbarui tanpa error.
  - Tidak ada angka kepatuhan negatif untuk akun baru/zero-data.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-08: Skrining Mandiri Tanda Bahaya (Buku KIA 2024)
- **Langkah Uji:**
  1. Buka menu **Skrining Tanda Bahaya**.
  2. Jawab butir-butir pertanyaan skrining (demam tinggi, perdarahan, pusing hebat, gerakan janin berkurang).
  3. Pilih opsi *"Ya"* pada minimal satu tanda bahaya untuk simulasi kegawatan.
  4. Tekan tombol **Kirim Skrining**.
- **Hasil yang Diharapkan:**
  - Muncul banner peringatan kegawatdaruratan berwarna merah/oranye.
  - Aplikasi menampilkan instruksi darurat langsung, nomor kontak fasilitas kesehatan, dan Bidan Pendamping.
  - Terdapat disclaimer darurat agar segera menuju faskes terdekat.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-09: Materi Edukasi Kehamilan
- **Langkah Uji:**
  1. Buka menu atau tab **Edukasi**.
  2. Buka kategori **Trimester 3** atau **Gizi Ibu Hamil**.
  3. Buka salah satu artikel edukasi.
  4. Geser (scroll) untuk membaca seluruh isi artikel.
- **Hasil yang Diharapkan:**
  - Daftar artikel tampil rapi berdasarkan kategori.
  - Teks, ringkasan, dan isi edukasi terbaca jelas dengan format bahasa Indonesia yang baik.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-10: P4K (Perencanaan Persalinan)
- **Langkah Uji:**
  1. Buka menu **P4K & Persalinan**.
  2. Tinjau data perencanaan: Nama Penolong Persalinan (Bidan/Dokter), Tempat Bersalin, Pendamping Persalinan, dan Calon Donor Darah.
  3. Periksa status kelengkapan stiker P4K.
- **Hasil yang Diharapkan:**
  - Informasi perencanaan persalinan tampil lengkap dan informatif sesuai prinsip Program P4K Kemenkes.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-11: Checklist Perlengkapan Persalinan
- **Langkah Uji:**
  1. Pada halaman P4K, buka tab **Checklist Persalinan**.
  2. Centang perlengkapan yang sudah disiapkan (misal: Buku KIA, pakaian bayi, kain bersih).
  3. Tutup dan buka kembali halaman checklist.
- **Hasil yang Diharapkan:**
  - Item yang dicentang tersimpan persisten.
  - Progres kelengkapan (% atau rasio X/Y) diperbarui secara akurat.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-12: Rencana Rujukan Transportasi Laut
- **Langkah Uji:**
  1. Buka sub-menu **Rencana Rujukan Kepulauan**.
  2. Periksa detail transportasi: Jenis armada air (misal *"Speedboat Puskesmas Keliling"* atau perahu motor).
  3. Periksa estimasi waktu tempuh pelayaran (misal 90 menit) dan kontak operator kapal.
- **Hasil yang Diharapkan:**
  - Rencana evakuasi air tertera jelas untuk daerah 3T / kepulauan Maluku.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-13: Informasi Rumah Tunggu Kelahiran (RTK)
- **Langkah Uji:**
  1. Pada halaman Rencana Rujukan, periksa bagian **Rumah Tunggu Kelahiran (RTK)**.
  2. Verifikasi Nama RTK, Alamat Lengkap di dekat RS Rujukan, dan Nomor Kontak Pengelola.
- **Hasil yang Diharapkan:**
  - Data RTK tampil lengkap untuk persiapan ibu menginap menjelang taksiran persalinan.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-14: Telekonsultasi Teks dengan Bidan
- **Langkah Uji:**
  1. Buka menu **Konsultasi Bidan**.
  2. Ketik pesan teks: `"Selamat pagi Bidan Siti, apakah kontraksi palsu di minggu ke-33 ini wajar?"`.
  3. Tekan tombol **Kirim**.
- **Hasil yang Diharapkan:**
  - Pesan terkirim seketika ke thread percakapan dengan tanda centang dan timestamp lokal.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-15: Pengiriman Lampiran Foto
- **Langkah Uji:**
  1. Pada layar Telekonsultasi, tekan ikon **Kamera / Galeri**.
  2. Pilih gambar foto (misal halaman Buku KIA atau foto kemasan obat).
  3. Kirim foto bersama pesan keterangan.
- **Hasil yang Diharapkan:**
  - Foto berhasil diunggah ke storage privat dan thumbnail gambar muncul di gelembung pesan.
  - Gambar dapat ditekan untuk melihat pratinjau resolusi penuh.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-16: Pengiriman Pesan Suara (Voice Note)
- **Langkah Uji:**
  1. Pada layar Telekonsultasi, tekan dan tahan tombol **Mikrofon (Voice Note)**.
  2. Rekam pesan suara selama 3–5 detik.
  3. Lepas tombol untuk mengirim rekaman.
  4. Tekan tombol putar (*Play*) pada pesan suara yang baru dikirim.
- **Hasil yang Diharapkan:**
  - Audio pesan suara berhasil diunggah dan terkirim dengan durasi yang tepat.
  - Suara terdengar jernih saat diputar ulang.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-17: Video Call Terjadwal (Meeting Link)
- **Langkah Uji:**
  1. Pada layar Konsultasi Bidan, periksa kartu **Jadwal Video Call**.
  2. Verifikasi informasi: Tanggal, Waktu (WIT), Judul Konsultasi, dan Nama Bidan.
  3. Tekan tombol **"Gabung Video Call"**.
- **Hasil yang Diharapkan:**
  - Jika belum ada jadwal: Tampil teks *"Belum ada jadwal video call"*.
  - Jika ada jadwal: Sistem membuka tautan HTTPS valid (Google Meet / Jitsi) melalui browser perangkat secara aman.
  - Skema berbahaya (`javascript:`, `file:`, `data:`) ditolak.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MOTH-18: Jadwal Kunjungan Rumah (Home Visit Ibu)
- **Langkah Uji:**
  1. Pada halaman Konsultasi / Beranda, periksa informasi **Kunjungan Rumah**.
  2. Verifikasi tanggal rencana kunjungan, jam, dan tujuan kunjungan bidan.
- **Hasil yang Diharapkan:**
  - Ibu dapat melihat jadwal kedatangan bidan ke tempat tinggal secara transparan.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

## 3. Checklist UAT: Web Portal Bidan Pendamping (Midwife Web)

### UAT-MID-01: Autentikasi Bidan (Login & Logout)
- **Langkah Uji:**
  1. Buka Web Portal pada browser desktop (`https://pfram.example.com`).
  2. Masukkan nomor HP `628122222222` dan kata sandi `MidwifeDev123!`.
  3. Tekan tombol **Masuk**.
  4. Di navigasi atas, tekan avatar profil dan pilih **Keluar (Logout)**.
- **Hasil yang Diharapkan:**
  - Login berhasil, diarahkan ke Dashboard Bidan.
  - Logout membersihkan token sesi dan kembali ke halaman Login.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MID-02: Dashboard Operasional Utama (8 Kartu Metrik)
- **Langkah Uji:**
  1. Masuk sebagai Bidan Siti Rahma.
  2. Tinjau 8 kartu metrik operasional pada halaman Dashboard:
     - Ibu Binaan Aktif
     - Pemantauan Hari Ini
     - ANC Hari Ini
     - ANC Belum Dikonfirmasi
     - Skrining Perlu Tindak Lanjut
     - Konsultasi Belum Dibaca
     - Video Call Hari Ini
     - Kunjungan Rumah Hari Ini
  3. Klik salah satu kartu (misal: Skrining Perlu Tindak Lanjut).
- **Hasil yang Diharapkan:**
  - Seluruh angka metrik berasal dari data dinamis backend (bukan teks statis).
  - Mengklik kartu mengarahkan pengguna ke halaman/filter terkait.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MID-03: Bagian "Perlu Ditindaklanjuti" (Prioritas Kerja)
- **Langkah Uji:**
  1. Pada Dashboard Bidan, periksa bagian **Perlu Ditindaklanjuti**.
  2. Periksa item tugas prioritas: skrining tanda bahaya belum ditangani, ANC lewat jadwal, konsultasi mendesak.
  3. Klik aksi tindak lanjut pada salah satu item.
- **Hasil yang Diharapkan:**
  - Daftar diurutkan berdasarkan urgensi administratif dan waktu.
  - Tautan aksi membuka modul pemeriksaan ibu terkait secara presisi.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MID-04: Daftar Ibu Binaan & Filter Trimester
- **Langkah Uji:**
  1. Buka menu **Ibu Binaan**.
  2. Coba filter tab: **Semua**, **Trimester 1**, **Trimester 2**, **Trimester 3**, **Ada Tindak Lanjut**, dan **ANC Terlewat**.
  3. Gunakan kotak pencarian untuk mencari nama `"Ratna Dewi"`.
- **Hasil yang Diharapkan:**
  - Daftar ibu menyajikan ringkasan nama, usia gestasi, trimester, jadwal ANC, status P4K, dan badge pesan baru.
  - Filter tab dan pencarian nama bekerja secara reaktif tanpa me-reload halaman.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MID-05: Detail Ibu Binaan & Pemantauan Medis
- **Langkah Uji:**
  1. Pilih salah satu ibu binaan (`Ibu Demo 03`).
  2. Buka tab **Pemantauan**.
  3. Bidan mengisi form pengukuran baru: BB `68.0` kg, TD `120/80` mmHg, catatan klinis: `"Kondisi ibu stabil"`.
  4. Tekan tombol simpan.
- **Hasil yang Diharapkan:**
  - Form tersimpan dan tabel riwayat pemantauan langsung diperbarui.
  - Terdapat paginasi dan filter jenis pengukuran (Semua / Berat Badan / Tekanan Darah).
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MID-06: Grafik Pemantauan Medis Web
- **Langkah Uji:**
  1. Pada detail ibu binaan tab Pemantauan, periksa grafik visual kurva.
  2. Arahkan kursor (*hover*) pada salah satu titik pengukuran.
- **Hasil yang Diharapkan:**
  - Tooltip menampilkan detail tanggal, nilai pengukuran, dan pencatat.
  - Kurva tampil jernih, proporsional, dan informatif.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MID-07: Manajemen ANC & Kepatuhan TTD
- **Langkah Uji:**
  1. Buka tab **Jadwal ANC & Kepatuhan** pada detail ibu binaan.
  2. Tekan tombol **+ Jadwalkan ANC Baru**.
  3. Masukkan tanggal, jam, jenis kunjungan, dan centang dokter spesialis jika wajib.
  4. Simpan jadwal baru.
  5. Periksa ringkasan kepatuhan TTD ibu binaan.
- **Hasil yang Diharapkan:**
  - Jadwal ANC baru tersimpan dan pengingat sistem aktif.
  - Bidan dapat mengonfirmasi kehadiran ibu atau melakukan penjadwalan ulang (*reschedule*).
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MID-08: Skrining Tanda Bahaya & Tindak Lanjut (Follow-Up)
- **Langkah Uji:**
  1. Buka tab **Screening & Tanda Bahaya**.
  2. Tinjau riwayat skrining yang berstatus `Perlu Tindak Lanjut` (*HIGH RISK*).
  3. Klik rincian butir jawaban ibu.
  4. Masukkan catatan tindak lanjut bidan: `"Ibu telah dihubungi via telepon, disarankan segera ke Puskesmas"`.
  5. Ubah status menjadi `Sudah Dihubungi` (*CONTACTED*) atau `Selesai Ditindaklanjuti` (*RESOLVED*).
- **Hasil yang Diharapkan:**
  - Status tindak lanjut berhasil diperbarui dan tersimpan dalam rekam jejak audit bidan.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MID-09: P4K & Rencana Rujukan Kepulauan Bidan
- **Langkah Uji:**
  1. Buka tab **P4K & Rujukan**.
  2. Tinjau sub-tab **Perencanaan Persalinan** dan checklist persiapan.
  3. Buka sub-tab **Rencana Rujukan Kepulauan**.
  4. Tekan tombol **Perbarui Rencana Rujukan**: edit nama kapal rujukan dan nomor kontak darurat RTK.
  5. Simpan perubahan.
- **Hasil yang Diharapkan:**
  - Data perencanaan rujukan laut terbarui dengan konfirmasi sukses.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MID-10: Konsultasi Telemedisin (Teks, Audio & Foto)
- **Langkah Uji:**
  1. Buka menu **Konsultasi**.
  2. Pilih thread percakapan dengan `Ibu Demo 03`.
  3. Baca pesan teks dari ibu, klik foto lampiran untuk memperbesar, dan putar pesan suara audio.
  4. Ketik dan kirim pesan balasan bidan.
  5. Ubah status konsultasi (misal dari *Open* ke *Selesai*).
- **Hasil yang Diharapkan:**
  - Semua pesan dan media ter-render tanpa kendala.
  - Balasan bidan terkirim dan status perhatian dapat disesuaikan.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MID-11: Penjadwalan Video Call oleh Bidan
- **Langkah Uji:**
  1. Pada halaman percakapan konsultasi, tekan tombol **Jadwalkan Video Call**.
  2. Masukkan tanggal, jam, judul konsultasi, dan tautan meeting: `https://meet.google.com/abc-defg-hij`.
  3. Coba masukkan link tidak aman (misal `http://` atau `javascript:...`) untuk menguji validasi.
  4. Simpan link valid.
  5. Tandai video call menjadi **Selesai** setelah simulasi panggilan.
- **Hasil yang Diharapkan:**
  - URL tidak aman ditolak oleh sistem.
  - URL HTTPS valid tersimpan dan jadwal muncul pada percakapan dan dashboard.
  - Perubahan status ke *COMPLETED* tercatat secara administratif.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MID-12: Penjadwalan & Pelaksanaan Kunjungan Rumah (Home Visit)
- **Langkah Uji:**
  1. Buka menu **Kunjungan Rumah** atau tab Kunjungan Rumah pada detail ibu binaan.
  2. Tekan tombol **+ Jadwalkan Kunjungan**.
  3. Masukkan tanggal kunjungan, jam, dan tujuan: `"Pemeriksaan tensi & evaluasi Buku KIA trimester 3"`.
  4. Simpan jadwal kunjungan.
  5. Tekan tombol **✓ Tandai Selesai**.
- **Hasil yang Diharapkan:**
  - Jadwal kunjungan rumah berhasil dibuat dengan status `SCHEDULED`.
  - Setelah selesai dikunjungi, status berhasil diubah menjadi `COMPLETED`.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-MID-13: Jadwal Hari Ini Bidan (Jadwal Terpadu)
- **Langkah Uji:**
  1. Buka menu **Jadwal Bidan / Jadwal Hari Ini**.
  2. Periksa daftar agenda kegiatan hari ini yang menggabungkan:
     - Kunjungan ANC
     - Video Call
     - Kunjungan Rumah
- **Hasil yang Diharapkan:**
  - Seluruh kegiatan terpadu dalam satu daftar kronologis dengan jenis kegiatan, nama ibu binaan, lokasi/link, dan status.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

## 4. Checklist UAT: Web Portal Administrator (Admin Web)

### UAT-ADM-01: Autentikasi Administrator (Login & Logout)
- **Langkah Uji:**
  1. Buka Web Portal (`https://pfram.example.com`).
  2. Masukkan nomor HP Admin `628111111111` dan kata sandi `AdminDev123!`.
  3. Tekan **Masuk**.
  4. Verifikasi masuk ke antarmuka Administrator, lalu uji Logout.
- **Hasil yang Diharapkan:**
  - Login berhasil membawa pengguna ke Dashboard Administrator.
  - Logout membersihkan token sesi dan kembali ke layar Login.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-ADM-02: Dashboard Utama Administrator
- **Langkah Uji:**
  1. Masuk sebagai Admin.
  2. Tinjau kartu ringkasan master data: Total Wilayah, Fasilitas Kesehatan, Bidan Terdaftar, Ibu Hamil, dan Kelengkapan Profil.
  3. Periksa indikator badge status sistem (*"Status Sistem Aktif"*).
- **Hasil yang Diharapkan:**
  - Statistik agregat tampil akurat dan label sistem berbahasa Indonesia bersih.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-ADM-03: Manajemen Wilayah (Master Wilayah)
- **Langkah Uji:**
  1. Buka menu **Master Wilayah**.
  2. Tinjau hierarki: Provinsi (Maluku), Kabupaten/Kota (Maluku Tengah), Kecamatan (Banda), dan Desa/Kelurahan.
  3. Tambah atau sunting salah satu data desa.
- **Hasil yang Diharapkan:**
  - Data wilayah tersusun dalam hierarki yang benar dan dapat dikelola secara administratif.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-ADM-04: Manajemen Fasilitas Kesehatan
- **Langkah Uji:**
  1. Buka menu **Fasilitas Kesehatan**.
  2. Tinjau daftar faskes: Puskesmas, Posyandu, dan Rumah Sakit Rujukan.
  3. Periksa ketersediaan faskes rujukan kepulauan (misal RSUD Dr. M. Haulussy Ambon).
- **Hasil yang Diharapkan:**
  - Seluruh faskes demo dan faskes nyata terdaftar dengan tipe dan tingkatan fasilitas yang tepat.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-ADM-05: Manajemen Bidan
- **Langkah Uji:**
  1. Buka menu **Data Bidan**.
  2. Cari bidan berdasarkan nama atau nomor HP.
  3. Periksa fasilitas penempatan dan status keaktifan bidan.
- **Hasil yang Diharapkan:**
  - Data profil bidan, nomor registrasi, dan fasilitas penugasan tampil akurat.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-ADM-06: Manajemen Ibu Hamil
- **Langkah Uji:**
  1. Buka menu **Data Ibu Hamil**.
  2. Cari ibu hamil berdasarkan nama atau NIK.
  3. Periksa status kehamilan aktif dan kelengkapan profil.
- **Hasil yang Diharapkan:**
  - Daftar ibu hamil menyajikan data demografis dasar tanpa membuka rincian percakapan medis sensitif.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-ADM-07: Penugasan Bidan & Isolasi Data Klinis (Anti-IDOR)
- **Langkah Uji:**
  1. Buka menu **Penugasan Bidan**.
  2. Atur atau ganti penugasan bidan pendamping untuk salah satu ibu hamil.
  3. Simpan penugasan.
  4. Periksa batas otorisasi: Verifikasi bahwa akun Admin **TIDAK** memiliki tombol/akses untuk membaca riwayat obrolan telekonsultasi pribadi antara ibu dan bidan.
- **Hasil yang Diharapkan:**
  - Penugasan bidan berhasil dicatat dengan riwayat perubahan (*assignment history*).
  - Batas privasi medis klinis terjaga ketat: Admin tidak dapat mengakses data sensitif percakapan klinis (Anti-IDOR teruji).
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-ADM-08: Pengaturan Aturan ANC (Smart ANC Rules)
- **Langkah Uji:**
  1. Buka menu **Aturan ANC**.
  2. Tinjau parameter jadwal ANC K1 hingga K6 sesuai standar Kemenkes RI (termasuk penandaan K1 dan K5 wajib dokter).
  3. Periksa rentang usia gestasi yang ditentukan untuk tiap kunjungan.
- **Hasil yang Diharapkan:**
  - Parameter aturan ANC tampil terstruktur dan dapat dijadikan rujukan kalkulasi otomatis sistem.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-ADM-09: Pengaturan Aturan Tanda Bahaya (Danger Signs Rules)
- **Langkah Uji:**
  1. Buka menu **Aturan Tanda Bahaya**.
  2. Tinjau butir-butir tanda bahaya kehamilan Buku KIA (perdarahan, kejang, demam, ketuban pecah dini, dll.).
  3. Periksa klasifikasi tingkat risiko (*Urgency: HIGH / CRITICAL*).
- **Hasil yang Diharapkan:**
  - Master aturan tanda bahaya terkonfigurasi sesuai panduan klinis maternal terkini.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-ADM-10: Manajemen Materi Edukasi
- **Langkah Uji:**
  1. Buka menu **Materi Edukasi**.
  2. Tambahkan satu draf artikel edukasi baru dengan judul `"Pentingnya Asupan Kalsium di Trimester 3"`.
  3. Tentukan kategori dan ringkasan isi.
  4. Simpan artikel.
- **Hasil yang Diharapkan:**
  - Artikel baru berhasil ditambahkan ke daftar katalog edukasi dan muncul pada modul edukasi aplikasi mobile.
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

### UAT-ADM-11: Audit Administratif & Log Sistem
- **Langkah Uji:**
  1. Buka menu **Audit Log / Riwayat Aktivitas**.
  2. Periksa jejak aktivitas terkini yang dilakukan oleh pengguna (login, pencatatan pengukuran, pengiriman pesan, pembaruan penugasan).
  3. Verifikasi bahasa deskripsi pada log aktivitas.
- **Hasil yang Diharapkan:**
  - Jejak audit tercatat secara berurutan (*timestamp*, aktor, aksi, status sukses).
  - Teks deskripsi audit menggunakan bahasa Indonesia yang natural dan mudah dipahami (misal: *"Pesan telekonsultasi terkirim — Berhasil"*).
- **Hasil Aktual:** `[ ] Belum diuji`
- **Status:** `[ ] PENDING`  `[ ] PASS`  `[ ] FAIL`
- **Catatan:** __________________________________________________

---

## 5. Ringkasan Hasil Pengujian & Rekomendasi Rilis

### Rekapitulasi Skenario
| Modul | Total Skenario | PASS | FAIL | PENDING |
|---|---|---|---|---|
| **Aplikasi Mobile (Ibu Hamil)** | 18 | _____ | _____ | 18 |
| **Web Portal (Bidan Pendamping)** | 13 | _____ | _____ | 13 |
| **Web Portal (Administrator)** | 11 | _____ | _____ | 11 |
| **TOTAL** | **42** | _____ | _____ | **42** |

### Keputusan Rilis (Release Decision)
- `[ ]` **GO FOR PRODUCTION DEPLOYMENT** (Semua skenario kritis PASS)
- `[ ]` **CONDITIONAL GO** (Terdapat catatan minor non-kritis yang dapat diperbaiki di patch berikutnya)
- `[ ]` **NO-GO / REJECTED** (Ditemukan kendala pemblokir / *blocker bug*)

### Tanda Tangan Persetujuan UAT

| Tanggal | Peran | Nama Terang | Tanda Tangan |
|---|---|---|---|
| _______________ | **QA Lead Tester** | _____________________________ | __________________ |
| _______________ | **Bidan Koordinator** | _____________________________ | __________________ |
| _______________ | **Lead Developer** | _____________________________ | __________________ |
| _______________ | **Product Owner / Dinkes** | _____________________________ | __________________ |
