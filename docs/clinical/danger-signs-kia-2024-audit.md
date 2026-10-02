# Laporan Audit Klinis: Buku KIA Kemenkes RI Edisi 2023 vs Edisi 2024

**Aplikasi:** PFRAM Telemedicine
**Tahap:** TAHAP 6B — HARDENING & CLINICAL CONTENT QA
**Tanggal Audit:** September 2026
**Status Audit:** PASSED & LOCKED

---

## 1. Latar Belakang & Tujuan Audit
Audit ini dilakukan untuk memverifikasi keselarasan modul skrining tanda bahaya kehamilan pada aplikasi PFRAM Telemedicine terhadap pembaruan resmi *Buku Kesehatan Ibu dan Anak (Buku KIA)* yang diterbitkan oleh Kementerian Kesehatan Republik Indonesia Edisi 2024, sekaligus mempertahankan integritas data historis pengguna yang tersimpan dengan aturan edisi 2023.

---

## 2. Perbandingan Komparatif: Edisi 2023 vs Edisi 2024

| Parameter | Buku KIA 2023 (`KEMENKES-KIA-2023-V1`) | Buku KIA 2024 (`KEMENKES-KIA-2024-V1`) | Keterangan & Rationale Klinis |
| :--- | :--- | :--- | :--- |
| **Status Sistem** | Legacy / Inaktif (`active: false`) | Aktif Standar (`active: true`) | Data lama tetap membaca 2023; seluruh skrining baru wajib menggunakan 2024. |
| **Jumlah Aturan** | 9 Aturan Klinis | 10 Aturan Klinis | Penambahan 1 aturan baru untuk deteksi dini ISK/infeksi traktus genitalis. |
| **Aturan Baru** | *Belum ada* | `DYSURIA_VAGINAL_DISCHARGE` | Buku KIA 2024 memberikan penekanan khusus pada gejala perih saat berkemih dan keputihan patologis yang berisiko memicu ketuban pecah dini dan persalinan prematur. |
| **Trimester Relevan Aturan Baru** | - | Trimester I, II, III (`[1, 2, 3]`) | Infeksi saluran kemih dan infeksi vagina relevan di semua usia gestasi. |
| **Kategori Tindakan Aturan Baru** | - | `WARNING` (`DANGER_SIGN_REPORTED`) | Memerlukan pemeriksaan klinis dan tes penunjang (urin lengkap/swab) oleh nakes, tanpa status darurat segera kecuali disertai demam/nyeri hebat. |

---

## 3. Matriks 10 Aturan Buku KIA Edisi 2024

1. `BLEEDING` (Perdarahan Jalan Lahir) — T1, T2, T3 — **URGENT**
2. `HIGH_FEVER` (Demam Tinggi / Panas Menggigil) — T1, T2, T3 — **URGENT**
3. `SEVERE_VOMITING` (Mual dan Muntah Terus-Menerus) — T1, T2 — **WARNING**
4. `SEVERE_ABDOMINAL_PAIN` (Nyeri Perut Hebat) — T1, T2, T3 — **URGENT**
5. `PREMATURE_FLUID_LEAK` (Air Ketuban Keluar Sebelum Waktunya) — T2, T3 — **URGENT**
6. `DECREASED_FETAL_MOVEMENT` (Gerakan Janin Berkurang atau Hilang) — T2, T3 — **URGENT**
7. `SEVERE_HEADACHE_BLURRED_VISION` (Sakit Kepala Berat, Pandangan Kabur, atau Nyeri Ulu Hati) — T2, T3 — **URGENT**
8. `FACIAL_HAND_SWELLING` (Bengkak pada Wajah dan Tangan) — T2, T3 — **WARNING**
9. `SEIZURE` (Kejang-kejang) — T1, T2, T3 — **URGENT**
10. `DYSURIA_VAGINAL_DISCHARGE` (Sakit Saat Kencing atau Keputihan Tidak Normal) — T1, T2, T3 — **WARNING**

---

## 4. Integritas Data & Larangan Mutasi Retroaktif
- Record skrining terdahulu (`DangerScreening`) yang memiliki `ruleSetVersion = "KEMENKES-KIA-2023-V1"` **TIDAK DIUBAH** secara retroaktif ke edisi 2024.
- Riwayat skrining ibu dan detail audit bidan menampilkan versi yang aktif pada saat skrining dilakukan.
- Endpoint `GET /api/admin/danger-rules` mengembalikan kedua versi aturan (`KEMENKES-KIA-2023-V1` inaktif dan `KEMENKES-KIA-2024-V1` aktif) dengan data lengkap.

---

## 5. Kepatuhan Bahasa Non-Diagnostik
Semua interface (API, Mobile, Web) telah diverifikasi dan diaudit bebas dari klaim diagnostik otomatis:
- Status `NO_DANGER_REPORTED` tidak pernah menyatakan ibu "sehat" atau kehamilan "normal", melainkan *"Tidak ada tanda bahaya yang Anda laporkan pada screening ini. Jika kondisi berubah atau Anda merasa khawatir, hubungi tenaga kesehatan."*
- Pilihan URGENT memicu arahan darurat langsung tanpa perantara algoritma AI: *"Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi."*
