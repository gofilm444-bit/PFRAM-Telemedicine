# Endpoint Tahap 3

- Referensi terautentikasi: `GET /api/reference/regions`, `/regions/:publicId/children`, `/facilities`, `/facilities/:publicId`.
- Admin wilayah: `GET/POST /api/admin/regions`, `GET/PATCH /api/admin/regions/:publicId`, aksi `activate`/`deactivate`.
- Admin fasilitas: pola yang sama melalui `/api/admin/facilities`.
- Admin bidan: `/api/admin/midwives`, detail/update/status, `PUT .../facilities`, dan `PUT .../regions`.
- Admin ibu dan penugasan: `/api/admin/mothers`, `/api/admin/assignments`, `replace`, `complete`, dan `cancel`.
- Ibu: `/api/mother/profile`, `/profile/completion`, `/pregnancies`, `/pregnancies/active`, dan `/midwife-assignment`.
- Bidan: `/api/midwife/profile`, `/mothers`, detail ibu, riwayat/kehamilan aktif, serta koreksi HPL beralasan.

Semua endpoint memvalidasi peran di backend, memakai Zod, mengembalikan pesan aman Bahasa Indonesia, dan tidak mengekspos UUID internal.
