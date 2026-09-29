# Schema profil dan penugasan

Tahap 3 menambahkan `Region` bertingkat, `HealthFacility`, profil ibu/bidan yang diperluas, `Pregnancy`, `MidwifeFacilityAssignment`, `MidwifeRegionAssignment`, dan `MotherMidwifeAssignment`. UUID internal hanya digunakan untuk relasi database; API memakai `publicId` UUID terpisah.

Data tidak dihapus permanen. Wilayah, fasilitas, dan bidan memakai `active`/`archivedAt`; relasi historis memakai `active`, `startedAt`, dan `endedAt`. Pergantian bidan menutup baris lama sebagai `REPLACED` dan membuat baris baru. Partial unique index menjamin satu kehamilan aktif dan satu penugasan aktif per ibu/kehamilan, termasuk saat request bersamaan.

Tanggal lahir, HPHT, tanggal penilaian, dan HPL disimpan sebagai PostgreSQL `DATE` untuk mencegah pergeseran timezone.
