# Skema Database Pemantauan Fisik Mandiri (Tahap 4A)

## 1. Ringkasan
Tahap 4A menambahkan model `MonitoringEntry` dan enum `MonitoringSource` ke dalam database PostgreSQL PFRAM Telemedicine untuk mendukung pencatatan berat badan dan tekanan darah ibu hamil secara terstruktur, historis, dan terenkripsi/diaudit.

## 2. Enum: `MonitoringSource`
Enum `MonitoringSource` mendefinisikan asal/tempat pengukuran dilakukan:
- `SELF`: Pengukuran mandiri oleh ibu di rumah.
- `POSYANDU`: Pengukuran saat kegiatan Posyandu.
- `PUSKESMAS`: Pengukuran di Puskesmas.
- `HOSPITAL`: Pengukuran di Rumah Sakit.
- `CLINIC`: Pengukuran di Klinik Pratama/Swasta.
- `MIDWIFE`: Pengukuran langsung oleh Bidan Praktik Mandiri atau kunjungan bidan.
- `OTHER`: Sumber fasilitas/tenaga kesehatan lainnya.

## 3. Model: `MonitoringEntry`
Tabel: `MonitoringEntry`

| Kolom | Tipe Data | Nullable | Keterangan |
|---|---|---|---|
| `id` | UUID | Tidak | Primary key internal (UUID v4) |
| `publicId` | UUID | Tidak | Identifier unik publik untuk API (UUID v4) |
| `motherId` | UUID | Tidak | Foreign key ke `MotherProfile.id` |
| `pregnancyId` | UUID | Tidak | Foreign key ke `Pregnancy.id` |
| `recordedAt` | TIMESTAMP(3) | Tidak | Waktu pengukuran fisik dilakukan |
| `source` | `MonitoringSource` | Tidak | Asal/metode pengukuran |
| `weightKg` | DECIMAL(5,2) | Ya | Berat badan dalam kilogram (presisi 2 desimal) |
| `systolicBp` | INTEGER | Ya | Tekanan darah sistolik (mmHg) |
| `diastolicBp` | INTEGER | Ya | Tekanan darah diastolik (mmHg) |
| `notes` | TEXT | Ya | Catatan tambahan |
| `createdByUserId` | UUID | Tidak | Foreign key ke `User.id` pembuat catatan |
| `createdAt` | TIMESTAMP(3) | Tidak | Waktu catatan dibuat di sistem (default: now) |
| `updatedAt` | TIMESTAMP(3) | Tidak | Waktu catatan terakhir diubah |
| `archivedAt` | TIMESTAMP(3) | Ya | Waktu pengarsipan (soft-delete) |

## 4. Index dan Relasi
- Index: `[motherId, archivedAt, recordedAt]` (optimasi query riwayat ibu)
- Index: `[pregnancyId, archivedAt, recordedAt]` (optimasi query per kehamilan)
- Index: `[createdByUserId]` (audit jejak pembuat)
- Relasi FK `motherId` → `MotherProfile.id` (RESTRICT on delete)
- Relasi FK `pregnancyId` → `Pregnancy.id` (RESTRICT on delete)
- Relasi FK `createdByUserId` → `User.id` (RESTRICT on delete)

## 5. Aturan Integritas Data
1. Tidak ada hard delete: penghapusan catatan menggunakan `archivedAt` (soft-delete).
2. Catatan yang diarsipkan (`archivedAt != null`) tidak muncul pada query aktif default.
3. Minimal salah satu harus bernilai: `weightKg` ATAU pasangan (`systolicBp` dan `diastolicBp`).
4. Tekanan darah wajib berpasangan (`systolicBp` dan `diastolicBp`).
5. Sistolik harus lebih besar dari diastolik (`systolicBp > diastolicBp`).
6. Nilai berat badan dan tekanan darah dibatasi secara teknis untuk mencegah typo ekstrem.
7. Tidak ada pelabelan atau diagnosis klinis otomatis yang disimpan pada tahap ini.
