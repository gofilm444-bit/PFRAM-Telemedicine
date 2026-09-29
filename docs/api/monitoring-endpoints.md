# Dokumentasi Endpoint API Pemantauan Fisik Mandiri (Tahap 4A)

## 1. Ringkasan
Endpoint monitoring mengelola data pengukuran berat badan dan tekanan darah ibu hamil. Akses dibatasi secara ketat berdasarkan Role-Based Access Control (RBAC):
- Role `MOTHER`: Hanya dapat membaca, menambah, mengubah, dan mengarsipkan data miliknya sendiri.
- Role `MIDWIFE`: Hanya dapat membaca dan mencatat data untuk ibu yang memiliki penugasan aktif (`MotherMidwifeAssignment.status == "ACTIVE"`).
- Role `ADMIN`: Ditolak (403 Forbidden) untuk menjaga kerahasiaan data klinis individual.

---

## 2. Endpoint Ibu (`/api/mother/monitoring`)

### 2.1 Daftar Riwayat Monitoring
- **Method / URL**: `GET /api/mother/monitoring`
- **Headers**: `Authorization: Bearer <MOTHER_JWT>`
- **Query Parameters**:
  - `pregnancyPublicId` (UUID, opsional): Filter berdasarkan kehamilan spesifik.
  - `from` (ISO string, opsional): Rentang awal `recordedAt`.
  - `to` (ISO string, opsional): Rentang akhir `recordedAt`.
  - `type` (`"all" | "weight" | "blood_pressure" | "both"`, opsional): Filter jenis pengukuran.
  - `page` (number, default: 1): Nomor halaman.
  - `limit` (number, default: 10, max: 50): Jumlah per halaman.
  - `sort` (`"asc" | "desc"`, default: `"desc"`): Urutan `recordedAt`.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "publicId": "34000000-0000-4000-8000-000000000003",
        "recordedAt": "2026-08-05T10:15:00.000Z",
        "source": "PUSKESMAS",
        "weightKg": 57.8,
        "systolicBp": 118,
        "diastolicBp": 78,
        "notes": "Pemeriksaan rutin Puskesmas development",
        "createdByName": "Bidan Development",
        "isArchived": false
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  },
  "requestId": "..."
}
```

### 2.2 Ringkasan Monitoring Aktif
- **Method / URL**: `GET /api/mother/monitoring/summary`
- **Headers**: `Authorization: Bearer <MOTHER_JWT>`
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "latestWeight": 57.8,
    "latestWeightRecordedAt": "2026-08-05T10:15:00.000Z",
    "latestBloodPressure": {
      "systolic": 118,
      "diastolic": 78
    },
    "latestBloodPressureRecordedAt": "2026-08-05T10:15:00.000Z",
    "previousWeight": 56.5,
    "weightChange": 1.3,
    "totalEntries": 3,
    "activePregnancyPublicId": "..."
  },
  "requestId": "..."
}
```

### 2.3 Detail Catatan Monitoring
- **Method / URL**: `GET /api/mother/monitoring/:publicId`
- **Headers**: `Authorization: Bearer <MOTHER_JWT>`
- **Response**: `200 OK`

### 2.4 Tambah Catatan Monitoring
- **Method / URL**: `POST /api/mother/monitoring`
- **Headers**: `Authorization: Bearer <MOTHER_JWT>`
- **Body**:
```json
{
  "pregnancyPublicId": "uuid (opsional, default: kehamilan aktif)",
  "recordedAt": "2026-09-29T10:00:00Z (opsional, default: waktu server)",
  "source": "SELF (opsional, default: SELF)",
  "weightKg": 60.5,
  "systolicBp": 120,
  "diastolicBp": 80,
  "notes": "Catatan pengukuran"
}
```
- **Response**: `201 Created`

### 2.5 Ubah Catatan Monitoring
- **Method / URL**: `PATCH /api/mother/monitoring/:publicId`
- **Headers**: `Authorization: Bearer <MOTHER_JWT>`
- **Body**: Bidang yang ingin diubah (`weightKg`, `systolicBp`, `diastolicBp`, `notes`, `source`, `recordedAt`).
- **Response**: `200 OK`

### 2.6 Arsipkan Catatan Monitoring (Soft-delete)
- **Method / URL**: `POST /api/mother/monitoring/:publicId/archive`
- **Headers**: `Authorization: Bearer <MOTHER_JWT>`
- **Response**: `200 OK`

---

## 3. Endpoint Bidan (`/api/midwife/mothers/:motherPublicId/monitoring`)

### 3.1 Daftar Monitoring Ibu Binaan
- **Method / URL**: `GET /api/midwife/mothers/:motherPublicId/monitoring`
- **Headers**: `Authorization: Bearer <MIDWIFE_JWT>`
- **Otorisasi**: Memeriksa penugasan aktif (`MOTHER_NOT_ASSIGNED` / 404 jika bukan binaan).
- **Response**: `200 OK`

### 3.2 Ringkasan Monitoring Ibu Binaan
- **Method / URL**: `GET /api/midwife/mothers/:motherPublicId/monitoring/summary`
- **Headers**: `Authorization: Bearer <MIDWIFE_JWT>`
- **Response**: `200 OK`

### 3.3 Detail Monitoring Ibu Binaan
- **Method / URL**: `GET /api/midwife/mothers/:motherPublicId/monitoring/:publicId`
- **Headers**: `Authorization: Bearer <MIDWIFE_JWT>`
- **Response**: `200 OK`

### 3.4 Bidan Mencatat Monitoring Ibu Binaan
- **Method / URL**: `POST /api/midwife/mothers/:motherPublicId/monitoring`
- **Headers**: `Authorization: Bearer <MIDWIFE_JWT>`
- **Body**: Sama seperti POST ibu, `source` default `"MIDWIFE"`.
- **Response**: `201 Created`
