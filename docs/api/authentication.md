# Endpoint autentikasi

- `GET /api/auth/consents`: daftar dokumen aktif.
- `POST /api/auth/register/mother`: registrasi ibu dan persetujuan dokumen.
- `POST /api/auth/login`: login web/mobile.
- `POST /api/auth/refresh`: rotasi sesi.
- `POST /api/auth/logout`: pencabutan sesi.
- `GET /api/auth/me`: profil publik dengan Bearer access token.

Semua respons memakai `{ success, data|error, requestId }`. Swagger development tersedia di `/docs`.
