# Alur kelengkapan profil

Setelah bootstrap session, `/api/auth/me` mengembalikan `profileCompletionStatus`. Mobile mengarahkan `PERSONAL_PROFILE_INCOMPLETE` atau `FACILITY_NOT_SELECTED` ke profil pribadi/fasilitas, lalu `PREGNANCY_PROFILE_INCOMPLETE` ke profil kehamilan. `MIDWIFE_NOT_ASSIGNED` tetap boleh masuk Beranda dengan kontak fasilitas sebagai pengganti. `COMPLETE` masuk app shell.

Redirect mobile hanya untuk pengalaman pengguna. Backend tetap memeriksa kepemilikan profil, kehamilan aktif, fasilitas/wilayah aktif, dan penugasan aktif pada setiap endpoint. Draft antar-layar hanya disimpan di memori, tidak di penyimpanan perangkat.
