# Rencana pengujian Tahap 3

Jalankan `npm run verify`, lalu migration/seed dan smoke test ketiga peran. Unit test mencakup date-only, HPL, tahun kabisat, pergantian tahun, usia ibu, batas trimester, penilaian tenaga kesehatan, validasi HPHT, routing kelengkapan mobile, komponen aksesibel, dan otorisasi dasar API.

Smoke test database mencakup CRUD non-destruktif wilayah/fasilitas, konsistensi hierarki, profil ibu, satu kehamilan aktif, penetapan/pergantian bidan, pembatasan ibu binaan, audit event, dan memastikan metadata audit tidak memuat kontak/catatan lengkap.
