# Matriks Verifikasi & Pengujian Tahap 5B — PFRAM Telemedicine

## 1. Lingkup Pengujian Tahap 5B
Tahap 5B fokus pada pengerasan (*hardening*), keandalan (*reliability*), aksesibilitas, dan UX fitur Smart ANC Reminder & Kepatuhan:
- Penjadwalan notifikasi lokal idempoten bebas duplikasi.
- Perlindungan transisi status ANC & Pengingat.
- Ketepatan rumus kepatuhan 30 hari (menghindari penalti pra-aktivasi & pengingat masa depan).
- Ketepatan filter dan query kunjungan terlewat (*Missed ANC*).
- Ketahanan zona waktu (WIB UTC+7, WITA UTC+8, WIT UTC+9) dan batas tengah malam.
- Nol ketergantungan layanan eksternal berbayar.

---

## 2. Matriks Pengujian Otomatis

### A. Pengujian Backend API (`apps/api/tests/anc.test.ts`)
1. **Missed Excludes Cancelled:** Jadwal yang berstatus `CANCELLED` tidak masuk dalam daftar kunjungan terlewat.
2. **Missed Excludes Completed:** Jadwal yang berstatus `COMPLETED` tidak masuk dalam daftar kunjungan terlewat.
3. **Missed Excludes Archived:** Jadwal dengan `archivedAt != null` diabaikan dari daftar kunjungan terlewat.
4. **Missed Excludes Future:** Jadwal yang waktu kunjungannya di masa depan tidak masuk dalam daftar keterlambatan.
5. **Missed Excludes Inactive Pregnancy:** Jadwal dari kehamilan lama yang sudah tidak aktif diabaikan.
6. **Missed Respects Active Assignment:** Hanya menampilkan ibu binaan dengan penugasan `ACTIVE`.
7. **Adherence Denominator Correct:** Penyebut kepatuhan TTD hanya menghitung pengingat yang telah jatuh tempo.
8. **Reminder Before Activation Excluded:** Hari-hari sebelum ibu mengaktifkan pengingat tidak dihitung sebagai kegagalan.
9. **Future Reminder Excluded:** Pengingat di masa mendatang tidak menurunkan skor kepatuhan saat ini.
10. **Duplicate Completion Safe:** Menekan tombol penyelesaian berulang kali bersifat idempoten dan tidak menimbulkan error.
11. **Invalid Status Transition Rejected:** Kunjungan `COMPLETED` atau `CANCELLED` tidak dapat diubah kembali menjadi status lain (400 `INVALID_STATUS_TRANSITION`).
12. **Reschedule Works:** Perubahan tanggal kunjungan oleh bidan memperbarui jadwal dan stempel waktu pengingat terkait.
13. **Cancelled Schedule Cannot Complete:** Jadwal yang telah dibatalkan ditolak saat mencoba konfirmasi kehadiran.
14. **Archived Schedule Hidden:** Jadwal yang telah diarsipkan tidak muncul pada daftar aktif ibu maupun bidan.
15. **Doctor Rule Configurable:** Rekomendasi kunjungan dokter TM III tetap fleksibel dan tidak terikat permanen pada kunjungan tunggal.

### B. Pengujian Mobile (`apps/mobile/lib/anc.test.ts`)
1. **Permission Granted:** Menjadwalkan pengingat saat izin diberikan.
2. **Permission Denied:** Menangani penolakan izin secara anggun tanpa crash.
3. **Permission Undetermined:** Menangani status awal izin belum ditentukan.
4. **Duplicate Schedule Prevented:** Penjadwalan berulang menggunakan identifier stabil yang sama sehingga tidak ada notifikasi ganda.
5. **TTD Time Change Reschedules:** Perubahan jam minum TTD menggantikan jadwal lama.
6. **Disable TTD Cancels:** Mematikan pengingat TTD membatalkan notifikasi harian dan tunda.
7. **ANC Reschedule Updates Local Notification:** Perubahan tanggal ANC memperbarui jadwal notifikasi lokal.
8. **ANC Cancel Removes Notification:** Pembatalan kunjungan menghapus notifikasi lokal terkait.
9. **Complete Reminder Reconciles:** Konfirmasi minum membatalkan notifikasi tunda hari tersebut.
10. **Snooze Replaces Prior Snooze:** Menekan tunda dengan durasi baru membatalkan tunda sebelumnya.
11. **Restart Reconciliation:** Fungsi rekonsiliasi dapat dipanggil ulang secara aman saat aplikasi dibuka kembali.
12. **Logout Reconciliation:** `cancelAllNotifications` membersihkan seluruh alarm lokal saat keluar.
13. **In-App Fallback Visible:** Banner peringatan dan kartu pengingat in-app tetap tampil meski notifikasi OS ditolak.
14. **UTC+7 Compatibility:** Perhitungan pengingat akurat untuk zona waktu Indonesia Barat.
15. **UTC+8 Compatibility:** Perhitungan pengingat akurat untuk zona waktu Indonesia Tengah.
16. **UTC+9 Compatibility:** Perhitungan pengingat akurat untuk zona waktu Indonesia Timur.
17. **Midnight Boundary:** Pengingat pada pukul 23:59 atau 00:01 ditangani tanpa kesalahan hari.
18. **Offline UI Fallback:** State in-app tetap dapat diakses dari cache lokal saat perangkat offline.
19. **Double Complete Protected:** Mutasi tombol dilindungi state `isPending` untuk mencegah klik ganda.
20. **Accessibility Labels:** Tombol dan input memiliki peran aksesibilitas dan label screen reader yang jelas.

### C. Pengujian Web Bidan (`apps/web/src/midwife-anc.test.tsx`)
1. **Missed List Filter:** Bidan dapat menyaring daftar terlewat berdasarkan periode (Semua, Hari ini, 7 hari terakhir).
2. **Completed Excluded:** Jadwal selesai tidak muncul di daftar missed.
3. **Cancelled Excluded:** Jadwal batal tidak muncul di daftar missed.
4. **Link Mother Detail:** Tautan nama ibu mengarah ke detail ibu binaan dengan benar.
5. **Reschedule:** Penjadwalan ulang kunjungan memperbarui tampilan antarmuka.
6. **Adherence Summary Accuracy:** Ringkasan kepatuhan TTD dan ANC ditampilkan akurat.
7. **Error Retry:** Tombol coba lagi (*retry*) tersedia dan berfungsi saat terjadi kendala jaringan.
8. **Unauthorized Handling:** Akses tanpa penugasan aktif diarahkan ke pesan penolakan aman.
9. **Responsive Structure:** Komponen tabel dan kartu beradaptasi dengan baik pada tata letak desktop dan mobile web.
10. **Existing Monitoring Tab Not Regressed:** Tab Pemantauan Fisik (Tahap 4) tetap berfungsi tanpa regresi.
