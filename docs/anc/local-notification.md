# Arsitektur Notifikasi Lokal — PFRAM Telemedicine (Tahap 5B)

## 1. Desain Arsitektur Terpusat
Untuk menjamin keandalan pengingat pada aplikasi mobile tanpa membebani server atau membutuhkan biaya push notification pihak ketiga, seluruh logika penjadwalan notifikasi diabstraksikan ke dalam modul terpusat:
`apps/mobile/lib/notifications.ts`

Komponen UI tidak boleh memanggil `Notifications.scheduleNotificationAsync` secara langsung tanpa melalui abstraksi ini.

---

## 2. Skema Identifier Deterministik
Guna mencegah duplikasi notifikasi saat pengguna membuka aplikasi berulang kali, melakukan *refetch* query, atau menyalakan ulang perangkat (*restart*), sistem menggunakan pemetaan identifier yang stabil secara konsep:

| Tipe Notifikasi | Skema Identifier | Perilaku Saat Update / Jadwal Ulang |
| :--- | :--- | :--- |
| **TTD Harian** | `pfram-ttd-daily` | Menggantikan jam lama secara idempoten |
| **Tunda (Snooze) TTD** | `pfram-ttd-snooze` | Membatalkan tunda lama dan memasang tunda baru |
| **Pemeriksaan ANC** | `pfram-anc-${schedulePublicId}` | Menggantikan tanggal pengingat lama untuk kunjungan terkait |

Saat `Notifications.scheduleNotificationAsync` menerima identifier yang telah ada, sistem operasi menggantikan (*replace*) entri lama tanpa menimbulkan penumpukan pengingat ganda.

---

## 3. Algoritma Rekonsiliasi (Reconciliation Pattern)
Fungsi `reconcileLocalNotifications({ settings, upcomingAncSchedules })` dieksekusi secara otomatis pada peristiwa:
1. Ibu berhasil masuk (*login*).
2. Aplikasi dibuka kembali dari latar belakang (*foreground wakeup*).
3. Pengaturan pengingat disimpan (*settings update*).
4. Data jadwal ANC dimuat ulang dari backend.

Langkah rekonsiliasi:
1. Memeriksa status izin notifikasi. Jika ditolak (`denied`), proses dihentikan secara aman tanpa error.
2. Jika TTD aktif: jadwalkan `pfram-ttd-daily` sesuai jam pengaturan. Jika dinonaktifkan: batalkan `pfram-ttd-daily` dan `pfram-ttd-snooze`.
3. Untuk setiap kunjungan ANC mendatang:
   - Jika status `SCHEDULED` dan tanggal pengingat masih di masa depan: jadwalkan `pfram-anc-${schedule.publicId}`.
   - Jika status telah `COMPLETED` atau `CANCELLED`: batalkan `pfram-anc-${schedule.publicId}`.
4. Saat pengguna keluar (*logout*): jalankan `cancelAllNotifications()`.

---

## 4. Keamanan & Privasi Data Notifikasi
Sesuai standar kerahasiaan data kesehatan:
- **Dilarang** menyimpan riwayat diagnosis, catatan medis bidan, atau token otentikasi di dalam payload notifikasi.
- Payload data hanya memuat metadata netral:
  * `{ type: "IRON_TABLET" }`
  * `{ type: "IRON_TABLET_SNOOZED" }`
  * `{ type: "ANC_VISIT", schedulePublicId: "..." }`
- Teks notifikasi disusun dalam Bahasa Indonesia yang ramah, sopan, dan suportif tanpa membocorkan rincian rekam medis ke layar terkunci (*lock screen*).
