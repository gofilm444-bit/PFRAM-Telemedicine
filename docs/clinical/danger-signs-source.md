# Sumber Rujukan Klinis Tanda Bahaya Kehamilan — PFRAM Telemedicine (Tahap 6A)

## 1. Identitas Dokumen Sumber Resmi
Seluruh daftar tanda bahaya dan pertanyaan skrining dalam modul ini bersumber langsung dari pedoman resmi nasional tanpa rekayasa atau asumsi developer:
- **Dokumen Sumber 1:** *Buku Kesehatan Ibu dan Anak (Buku KIA)*, Kementerian Kesehatan Republik Indonesia, Edisi 2023 (Bagian: Lembar Ibu Hamil — Kenali Tanda Bahaya Kehamilan).
- **Dokumen Sumber 2:** *Pedoman Pelayanan Antenatal Terpadu*, Kementerian Kesehatan Republik Indonesia, Edisi Terakhir.
- **Versi Rule Set:** `KEMENKES-KIA-2023-V1`
- **Tanggal Efektif:** 1 Januari 2026
- **Status Review:** Terverifikasi sesuai teks resmi Kemenkes RI (Last reviewed: September 2026).

---

## 2. Matriks Tanda Bahaya, Relevansi Trimester & Kategori Tindakan

| Kode Rule | Judul Resmi Buku KIA | Relevansi Trimester | Pertanyaan Skrining (Wording Ramah Ibu) | Kategori Tindakan | Rujukan Halaman / Konteks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `BLEEDING` | Perdarahan Jalan Lahir | Trimester I, II, III | "Apakah Ibu mengalami perdarahan atau keluar darah dari jalan lahir?" | **URGENT** (`REQUIRES_IMMEDIATE_CARE`) | Buku KIA: Perdarahan pada hamil muda maupun hamil tua harus segera dirujuk ke faskes. |
| `HIGH_FEVER` | Demam Tinggi / Menggigil | Trimester I, II, III | "Apakah Ibu mengalami demam tinggi, badan terasa sangat panas, atau menggigil?" | **URGENT** (`REQUIRES_IMMEDIATE_CARE`) | Buku KIA: Demam tinggi dapat mengindikasikan infeksi sistemik yang membahayakan janin. |
| `SEVERE_VOMITING` | Mual dan Muntah Terus-Menerus | Trimester I, II | "Apakah Ibu muntah terus-menerus hingga tidak dapat makan atau minum sama sekali?" | **WARNING** (`DANGER_SIGN_REPORTED`) | Buku KIA: Emesis gravidarum berat/hiperemesis membutuhkan evaluasi cairan oleh nakes. |
| `SEVERE_ABDOMINAL_PAIN` | Nyeri Perut Hebat | Trimester I, II, III | "Apakah Ibu merasakan nyeri atau kram perut bagian bawah yang sangat hebat?" | **URGENT** (`REQUIRES_IMMEDIATE_CARE`) | Buku KIA: Nyeri perut hebat di luar his fisiologis memerlukan pemeriksaan segera. |
| `PREMATURE_FLUID_LEAK` | Air Ketuban Keluar Sebelum Waktunya | Trimester II, III | "Apakah keluar cairan ketuban yang merembes atau mengalir dari jalan lahir?" | **URGENT** (`REQUIRES_IMMEDIATE_CARE`) | Buku KIA: Ketuban pecah dini berisiko infeksi intrauterin dan persalinan prematur. |
| `DECREASED_FETAL_MOVEMENT` | Gerakan Janin Berkurang / Hilang | Trimester II, III (Umur $>20$ mg) | "Apakah gerakan janin terasa jauh berkurang atau tidak terasa sama sekali hari ini?" | **URGENT** (`REQUIRES_IMMEDIATE_CARE`) | Buku KIA: Tanda gawat janin. Minimal 10 gerakan dalam 12 jam pada trimester II & III. |
| `SEVERE_HEADACHE_BLURRED_VISION` | Sakit Kepala Berat, Pandangan Kabur, Nyeri Ulu Hati | Trimester II, III | "Apakah Ibu mengalami sakit kepala berat, pandangan mendadak kabur, atau nyeri ulu hati hebat?" | **URGENT** (`REQUIRES_IMMEDIATE_CARE`) | Buku KIA: Tanda bahaya preeklamsia berat / impending eclampsia. |
| `FACIAL_HAND_SWELLING` | Bengkak pada Wajah dan Tangan | Trimester II, III | "Apakah terjadi bengkak tiba-tiba pada wajah, kelopak mata, atau jari tangan Ibu?" | **WARNING** (`DANGER_SIGN_REPORTED`) | Buku KIA: Edema patologis pada area atas tubuh memerlukan pemeriksaan tekanan darah & urin. |
| `SEIZURE` | Kejang | Trimester I, II, III | "Apakah Ibu pernah mengalami kejang atau tubuh tersentak tak sadar?" | **URGENT** (`REQUIRES_IMMEDIATE_CARE`) | Buku KIA: Kegawatdaruratan eklampsia; rujukan darurat mutlak segera. |

---

## 3. Batasan Klinis & Larangan Otomatisasi Diagnostik
Aplikasi PFRAM Telemedicine Level Standar menjunjung tinggi kode etik kedokteran dan keselamatan pasien:
1. **Tidak Ada Diagnosis Medis Otomatis:**
   - Aplikasi **DILARANG** menyimpulkan bahwa ibu menderita "Preeklamsia", "Abortus Imminens", "Solusio Plasenta", atau "Ketuban Pecah Dini".
   - Status yang dihasilkan murni bersifat administratif dan routing:
     * `NO_DANGER_REPORTED`
     * `DANGER_SIGN_REPORTED`
     * `REQUIRES_IMMEDIATE_CARE`
2. **Tidak Menggunakan AI/ML:**
   - Evaluasi murni berbasis rule deterministik deterministik Boolean (*if-any-urgent $\to$ immediate care*).
3. **Wording Hasil Skrining:**
   - Ketika tidak ada tanda bahaya dilaporkan:
     > *"Tidak ada tanda bahaya yang Anda laporkan pada screening ini. Jika kondisi berubah atau Anda merasa khawatir, hubungi tenaga kesehatan."*
     *(Dilarang menyatakan "Kehamilan Anda normal" atau "Anda sehat").*
   - Ketika ada tanda bahaya dilaporkan:
     > *"Anda melaporkan tanda yang perlu segera diperiksa oleh tenaga kesehatan. Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi."*
