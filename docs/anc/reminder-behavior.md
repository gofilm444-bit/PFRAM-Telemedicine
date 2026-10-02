# Smart ANC Reminder Behavior — PFRAM Telemedicine (Tahap 5B)

## 1. Filosofi & Batasan Level Standar
Pada PFRAM Level Standar, seluruh fungsionalitas pengingat kehamilan dan kepatuhan tablet tambah darah (TTD) dimaksimalkan dengan standar rekayasa tertinggi tanpa membebani biaya layanan eksternal (seperti SMS gateway berbayar atau WhatsApp Business API).

Pengingat berjalan pada dua lapisan komplementer:
1. **Lapisan In-App (Selalu Aktif):** Kartu pengingat harian TTD dan jadwal ANC mendatang pada antarmuka aplikasi mobile dan dashboard web. Tetap berfungsi penuh sekalipun notifikasi sistem operasi ditolak atau perangkat sedang luring (offline).
2. **Lapisan Notifikasi Lokal Perangkat (Expo Notifications):** Notifikasi terjadwal lokal di perangkat ibu hamil yang memicu alarm/pemberitahuan sesuai waktu pilihan ibu.

---

## 2. Penanganan Izin Notifikasi (Permission Handling)
Sistem mengenali tiga status izin dari sistem operasi perangkat:
- **`granted`:** Notifikasi lokal aktif terjadwal.
- **`denied`:** Pengguna menolak izin notifikasi. Aplikasi tidak crash; banner peringatan ramah ditampilkan: *"Notifikasi belum diizinkan. Jadwal tetap tersimpan dan dapat dilihat di aplikasi"* disertai tombol akses cepat *"Buka Pengaturan"* (`Linking.openSettings()`).
- **`undetermined`:** Izin belum diminta. Aplikasi meminta izin secara santun saat fitur pengingat pertama kali diaktifkan.

---

## 3. Siklus Hidup Pengingat Tablet Tambah Darah (TTD)
- **Identifier Unik:** `pfram-ttd-daily`
- **Jadwal Harian:** Terjadwal setiap hari pada jam pilihan ibu (standar: 20:00 WIB).
- **Pengaturan Waktu:** Saat ibu mengubah jam di menu Pengaturan Pengingat, notifikasi lama dibatalkan dan digantikan oleh jadwal jam yang baru secara idempoten.
- **Penonaktifan:** Jika ibu menonaktifkan pengingat TTD, notifikasi `pfram-ttd-daily` dan `pfram-ttd-snooze` segera dibatalkan secara lokal.
- **Konfirmasi "Sudah Minum":**
  * Status pengingat berubah menjadi `COMPLETED`.
  * Tombol dinonaktifkan saat mutasi berlangsung untuk mencegah *double-tap*.
  * Notifikasi tunda (snooze) hari tersebut langsung dibatalkan.
  * Ringkasan kepatuhan (*adherence summary*) otomatis diperbarui.

---

## 4. Siklus Hidup Pengingat Kunjungan ANC
- **Identifier Unik:** `pfram-anc-${schedulePublicId}`
- **Waktu Notifikasi:** Dihitung dari `scheduledAt` dikurangi `ancReminderDaysBefore` (misal H-1 atau H-2) pada jam pengingat pilihan ibu (standar: 08:00 WIB).
- **Proteksi Waktu Lampau:** Jika waktu pengingat yang dihitung telah lewat dari saat ini, sistem tidak akan menjadwalkan notifikasi palsu di masa lalu.
- **Penjadwalan Ulang (Reschedule):** Saat bidan mengubah tanggal kunjungan, identifier yang sama dijadwalkan ulang dengan tanggal baru (menggantikan notifikasi lama).
- **Pembatalan / Penyelesaian:** Jika jadwal dibatalkan atau ibu mengonfirmasi "Sudah Hadir", notifikasi lokal terkait langsung dibatalkan.

---

## 5. Mekanisme Tunda (Snooze)
- **Pilihan Durasi:** 10 menit, 30 menit, dan 60 menit.
- **Identifier Tunggal:** `pfram-ttd-snooze`.
- **Penggantian Idempoten:** Memilih durasi tunda baru membatalkan jadwal tunda sebelumnya.
- **Integritas Status:** Pengingat yang telah berstatus `COMPLETED` tidak dapat di-snooze lagi dan akan ditolak oleh API dengan kode `INVALID_STATE`.

---

## 6. Kekebalan Zona Waktu (Timezone Hardening)
- Seluruh stempel waktu disimpan dalam format standar UTC ISO-8601 di basis data PostgreSQL.
- Perhitungan pengingat lokal menghormati waktu lokal perangkat ibu (WIB UTC+7, WITA UTC+8, WIT UTC+9).
- Perhitungan H-x dan waktu tunda aman terhadap pergantian tengah malam (*midnight rollover*) dan pengingat larut malam (misal pukul 23:30).
