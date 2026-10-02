# Matriks Verifikasi & Pengujian Tahap 6A — PFRAM Telemedicine

## 1. Cakupan Pengujian Tahap 6A
Pengujian Tahap 6A memvalidasi keandalan, keamanan otorisasi (anti-IDOR), isolasi data klinis, serta keselamatan respons skrining tanda bahaya:
- Filter tanda bahaya adaptif terhadap usia kehamilan (Trimester I, II, III).
- Pencegahan pengiriman skrining kosong atau butir ganda.
- Penentuan status non-diagnostik: `NO_DANGER_REPORTED`, `DANGER_SIGN_REPORTED`, `REQUIRES_IMMEDIATE_CARE`.
- Pesan darurat dan tombol kontak faskes/bidan.
- Otorisasi ketat: Ibu hanya miliknya sendiri, Bidan hanya ibu binaan aktif, Admin tunduk isolasi data klinis.
- Alur kerja tindak lanjut bidan (*follow-up status transitions*).
- Audit log untuk setiap penciptaan dan pembaruan skrining.
- Ketahanan offline pada mobile UI (jawaban lokal dipertahankan saat gangguan jaringan, instruksi darurat tetap muncul).

---

## 2. Rincian Matriks Pengujian

### A. Backend API Tests (`apps/api/tests/danger-screening.test.ts`)
1. **Get Active Rules:** Mengambil daftar aturan dari versi aktif.
2. **Trimester 1 Filter:** Hanya memuat aturan relevan untuk Trimester 1 (gerakan janin tidak tampil).
3. **Trimester 2 & 3 Filter:** Memuat aturan gerakan janin, air ketuban, dan preeklamsia.
4. **Create No-Danger Screening:** Mengembalikan status `NO_DANGER_REPORTED` saat semua jawaban TIDAK.
5. **Create Danger Screening:** Mengembalikan status `REQUIRES_IMMEDIATE_CARE` jika ada gejala URGENT.
6. **Create Warning Screening:** Mengembalikan status `DANGER_SIGN_REPORTED` jika hanya ada gejala WARNING.
7. **Empty Responses Rejected:** Penolakan HTTP 400 jika array respon kosong.
8. **Duplicate Rule Response Rejected:** Penolakan HTTP 400 jika terdapat duplikasi kode rule dalam satu pengiriman.
9. **Inactive Rule Rejected:** Penolakan HTTP 400 jika menjawab kode yang tidak aktif dalam ruleset.
10. **Mother Isolation:** Ibu tidak dapat melihat riwayat skrining milik ibu lain (Anti-IDOR).
11. **Midwife Active Assignment:** Bidan berpenugasan aktif dapat mengakses daftar & detail skrining ibu binaannya.
12. **Unassigned Midwife Denied:** Bidan tanpa penugasan aktif ditolak dengan HTTP 403/404.
13. **Admin Clinical Isolation:** Admin ditolak saat mencoba membuka detail skrining perorangan.
14. **Screening History List:** Daftar riwayat tersortir kronologis terbaru.
15. **Screening Detail:** Detail memuat butir pertanyaan, jawaban, dan kategori keparahan.
16. **Follow-Up List:** Bidan dapat melihat antrean skrining yang membutuhkan tindak lanjut.
17. **Follow-Up Update:** Bidan dapat memperbarui status tindak lanjut dan catatan operasional.
18. **Invalid Follow-Up Transition Rejected:** Transisi status tidak sah ditolak dengan HTTP 400.
19. **Archived Screening Hidden:** Skrining yang diarsipkan tidak muncul di antrean aktif.
20. **Audit Logs:** Memastikan pencatatan audit log `DANGER_SCREENING_CREATED` dan `DANGER_FOLLOWUP_UPDATED`.

### B. Mobile UI Tests (`apps/mobile/lib/danger-screening.test.ts`)
1. **Home Card Render:** Kartu edukasi tanda bahaya tampil di beranda dengan tombol mulai.
2. **Rules Fetch & Filter:** Memfilter pertanyaan berdasarkan trimester aktif ibu.
3. **Yes/No Answer Selection:** Memperbarui state jawaban saat opsi YA / TIDAK ditekan.
4. **Progress Counter:** Menampilkan progres pertanyaan (misal "Pertanyaan 3 dari 8").
5. **No-Danger Result View:** Menampilkan teks aman netral non-diagnostik.
6. **Urgent Danger Result View:** Menampilkan instruksi darurat "Segera menuju fasilitas kesehatan".
7. **Contact Bidan Deep Link:** Tombol hubungi bidan memuat format tautan telepon & WhatsApp yang valid.
8. **Contact Facility Deep Link:** Tombol faskes memuat tautan telepon faskes primer.
9. **History Screen Items:** Menampilkan ringkasan riwayat dan jumlah tanda yang dilaporkan.
10. **History Detail View:** Menampilkan detail jawaban dan waktu pengisian.
11. **Network Error Preserves Answers:** Jawaban pengguna tetap tersimpan di form saat gagal kirim.
12. **Local Emergency Fallback:** Peringatan darurat tetap tampil lokal meski submit jaringan gagal jika ada jawaban URGENT = YA.
13. **Retry Mechanism:** Tombol Coba Lagi dapat mengirimkan kembali jawaban yang tersimpan.
14. **Accessibility Roles & Labels:** Tombol YA/TIDAK memiliki peran aksesibilitas yang jelas untuk screen reader.
15. **Status Announced Without Color:** Pesan status terbaca jelas tanpa mengandalkan warna semata.
16. **Logout Resets Form:** Form dibersihkan saat pengguna keluar aplikasi.

### C. Web Dashboard Bidan Tests (`apps/web/src/midwife-danger-screening.test.tsx`)
1. **Tab Rendering:** Tab "Screening & Tanda Bahaya" tersedia di halaman detail ibu binaan.
2. **Latest Screening Summary:** Menampilkan skrining terbaru beserta tanggal dan status tindakan.
3. **History Table:** Menampilkan daftar riwayat skrining ibu binaan.
4. **Detail Modal / Drawer:** Menampilkan butir jawaban yang dilaporkan ibu.
5. **Follow-Up Queue Navigation:** Tautan "Perlu Tindak Lanjut" tersedia di navigasi bidan.
6. **Follow-Up Queue List:** Menampilkan daftar ibu yang memiliki skrining aktif belum terselesaikan.
7. **Action Mark Contacted:** Memperbarui status menjadi `CONTACTED`.
8. **Action Mark Referred:** Memperbarui status menjadi `REFERRED_TO_FACILITY`.
9. **Action Mark Arrived:** Memperbarui status menjadi `ARRIVED_AT_FACILITY`.
10. **Action Mark Resolved:** Memperbarui status menjadi `RESOLVED` dan menghapus dari antrean aktif.
11. **Unauthorized Mother Access:** Bidan ditolak jika mencoba membuka skrining ibu non-binaan.
12. **Error State & Retry:** Tampilan galat dan tombol muat ulang berfungsi saat gagal jaringan.
13. **Existing ANC Tab Intact:** Tab Jadwal ANC (Tahap 5) tetap berfungsi normal.
14. **Existing Monitoring Tab Intact:** Tab Pemantauan Fisik (Tahap 4) tetap berfungsi normal.
