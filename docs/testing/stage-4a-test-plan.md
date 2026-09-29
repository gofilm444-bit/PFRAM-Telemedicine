# Rencana Pengujian dan Verifikasi Tahap 4A

## 1. Lingkup Pengujian
Pengujian Tahap 4A mencakup verifikasi database, integritas validasi, aturan bisnis pencatatan, ringkasan dinamis, otorisasi peran (MOTHER, MIDWIFE, ADMIN), dan pencatatan audit log.

## 2. Matriks Pengujian Backend (`apps/api/tests/monitoring.test.ts`)

| No | Kasus Uji | Ekspektasi | Hasil |
|---|---|---|---|
| 1 | Mother create weight only | Status 201, weight terisi, BP null | PASS |
| 2 | Mother create BP only | Status 201, BP terisi, weight null | PASS |
| 3 | Mother create weight + BP | Status 201, semua nilai terisi | PASS |
| 4 | Entry kosong | Status 400, VALIDATION_ERROR | PASS |
| 5 | Weight <= 0 | Status 400, VALIDATION_ERROR | PASS |
| 6 | Weight typo ekstrem (< 20 kg atau > 300 kg) | Status 400, VALIDATION_ERROR | PASS |
| 7 | Hanya systolic | Status 400, VALIDATION_ERROR | PASS |
| 8 | Hanya diastolic | Status 400, VALIDATION_ERROR | PASS |
| 9 | systolic <= diastolic | Status 400, VALIDATION_ERROR | PASS |
| 10 | BP typo ekstrem | Status 400, VALIDATION_ERROR | PASS |
| 11 | recordedAt masa depan | Status 400, VALIDATION_ERROR | PASS |
| 12 | Mother hanya melihat monitoring sendiri | Status 200, item miliknya | PASS |
| 13 | Mother tidak melihat monitoring mother lain | Status 200 (kosong) / 404 direct ID | PASS |
| 14 | Create hanya untuk pregnancy sendiri | Status 400, NO_ACTIVE_PREGNANCY | PASS |
| 15 | Archived item hilang dari active list | Status 200, tidak muncul di items | PASS |
| 16 | Archived item tetap ada secara historis | Database row tetap ada | PASS |
| 17 | Edit own entry | Status 200, nilai terbarui | PASS |
| 18 | Edit mother lain | Status 404, MONITORING_NOT_FOUND | PASS |
| 19 | Active assigned midwife dapat membaca | Status 200, daftar terisi | PASS |
| 20 | Unrelated midwife ditolak | Status 404, MOTHER_NOT_ASSIGNED | PASS |
| 21 | Active assigned midwife dapat mencatat | Status 201, source MIDWIFE | PASS |
| 22 | Inactive / replaced assignment ditolak | Status 404, MOTHER_NOT_ASSIGNED | PASS |
| 23 | Summary latest weight benar | Nilai berat badan terbaru tepat | PASS |
| 24 | Summary latest BP benar | Nilai sistolik dan diastolik tepat | PASS |
| 25 | weightChange benar | latestWeight - previousWeight | PASS |
| 26 | Pagination query | page dan pageSize sesuai limit | PASS |
| 27 | Filter from/to | Memfilter catatan sesuai rentang | PASS |
| 28 | Filter type (weight, blood_pressure, both) | Menampilkan kolom sesuai jenis | PASS |
| 29 | Audit log create | Action MONITORING_CREATED sukses | PASS |
| 30 | Audit log update | Action MONITORING_UPDATED sukses | PASS |
| 31 | Audit log archive | Action MONITORING_ARCHIVED sukses | PASS |
| 32 | No sensitive leak | Tidak ada passwordHash atau token di log/res | PASS |

## 3. Matriks Otorisasi Khusus
- `ADMIN`: Akses ke `/api/mother/monitoring` atau `/api/midwife/mothers/:id/monitoring` menghasilkan `403 Forbidden`.
- `MOTHER`: Tidak dapat mengakses endpoint `/api/midwife/*`.
- `MIDWIFE`: Tidak dapat mengakses endpoint `/api/mother/*`.
