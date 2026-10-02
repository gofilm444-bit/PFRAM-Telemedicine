# Rumus Kalkulasi Kepatuhan (Adherence Calculation) — PFRAM Telemedicine (Tahap 5B)

## 1. Prinsip Utama
Perhitungan kepatuhan dalam PFRAM Telemedicine bersifat **suportif, objektif, dan non-diagnostik**. Metrik ini bertujuan membantu ibu hamil dan bidan pendamping memantau rutinitas konsumsi tablet tambah darah serta kehadiran pemeriksaan antenatal, tanpa menghasilkan kesimpulan atau vonis medis otomatis.

---

## 2. Rumus Kepatuhan Tablet Tambah Darah (TTD 30 Hari)

$$\text{Persentase Kepatuhan (\%)} = \left( \frac{\text{Pengingat Selesai (Completed)}}{\text{Pengingat Wajib yang Telah Jatuh Tempo (Eligible Due)}} \right) \times 100$$

### Definisi Parameter:
1. **Jendela Waktu Efektif:**
   $$\text{Tanggal Mulai Efektif} = \max(\text{30 Hari Lalu}, \text{Tanggal Pendaftaran / Aktivasi Pengingat})$$
2. **Penyebut (Denominator — Eligible Due):**
   Jumlah pengingat TTD dengan kriteria:
   - `motherId` = ID ibu bersangkutan.
   - `type` = `IRON_TABLET`.
   - `scheduledAt` berada dalam rentang $[\text{Tanggal Mulai Efektif}, \text{Saat Ini}]$.
   - `status` BUKAN `DISMISSED` atau `EXPIRED`.
3. **Pembilang (Numerator — Completed):**
   Jumlah pengingat TTD dalam rentang jatuh tempo yang sama dengan `status` = `COMPLETED`.

### Aturan Keamanan & Keadilan Data:
- **Pengecualian Masa Sebelum Aktivasi:** Hari-hari sebelum ibu mendaftar atau mengaktifkan pengingat tidak boleh dianggap sebagai hari gagal minum.
- **Pengecualian Jadwal Mendatang:** Pengingat dengan $\text{scheduledAt} > \text{Saat Ini}$ tidak dimasukkan ke dalam penyebut agar persentase kepatuhan tidak turun sebelum jam minum tiba.
- **Pengecualian Status Dibatalkan/Dihapus:** Pengingat yang dibatalkan atau diarsipkan tidak dihitung.
- **Kondisi Awal (Zero Due):** Jika ibu baru saja mengaktifkan pengingat pada hari berjalan dan belum ada pengingat yang jatuh tempo ($\text{Eligible Due} = 0$), persentase kepatuhan ditetapkan $100.0\%$.

---

## 3. Definisi Metrik Kunjungan ANC
Pada rekap bidan dan profil kehamilan ibu, status kunjungan dihitung dengan aturan berikut:
1. **Total Terjadwal:**
   Seluruh kunjungan dengan `archivedAt IS NULL`.
2. **Sudah Hadir (Completed):**
   Kunjungan dengan `status = COMPLETED` dan `archivedAt IS NULL`.
3. **Belum Dikonfirmasi / Terlewat (Missed ANC):**
   Kunjungan dengan:
   - `status = SCHEDULED`
   - `scheduledAt < Saat Ini`
   - `archivedAt IS NULL`
   - Terhubung dengan **kehamilan aktif** (`pregnancy.status = ACTIVE`)
   - Bidan memiliki **penugasan aktif** (`assignment.status = ACTIVE`).

Data kehamilan masa lalu yang sudah selesai atau diarsipkan tidak diikutkan dalam daftar keterlambatan aktif.
