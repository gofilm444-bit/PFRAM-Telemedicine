# PFRAM Telemedicine

PFRAM adalah fondasi aplikasi telemedicine berbahasa Indonesia untuk ibu hamil, bidan, dan administrator. Tagline: **Pantau Kehamilan, Lindungi Ibu dan Bayi**.

Tahap 3 menyediakan master wilayah/fasilitas, profil ibu dan kehamilan, profil bidan, serta penugasan bidan. Modul pemantauan, skrining, diagnosis, tindak lanjut klinis, dan keputusan klinis **belum aktif**; PFRAM tidak menggantikan tenaga kesehatan.

## Arsitektur

- `apps/mobile`: React Native + Expo Router, khusus Android (`id.pfram.telemedicine`).
- `apps/web`: React + Vite + Tailwind, dashboard bidan/admin.
- `apps/api`: Fastify + Prisma + PostgreSQL, REST API bersama.
- `packages`: types, validation, API client, config, dan design tokens bersama.
- `infrastructure`: PostgreSQL + MinIO melalui Docker Compose dan contoh Nginx hardening.

## Prasyarat

Node.js 20+, npm 10+, Docker Desktop/Engine dengan Compose, dan PowerShell. Expo Go atau emulator Android diperlukan untuk pengujian perangkat.

## Menjalankan development

```powershell
npm install
npm run dev
```

Perintah `npm run dev` akan:

1. Membuat `.env` dari `.env.example` jika belum tersedia, tanpa menimpa konfigurasi yang sudah ada.
2. Menyalakan PostgreSQL dan MinIO melalui Docker Compose.
3. Menjalankan Prisma generate, migration, dan seed idempotent.
4. Menjalankan API, web, dan Expo secara bersamaan.

Pada Windows, script akan mencoba menyalakan Docker Desktop otomatis dan menunggu Linux engine siap. Jika Docker meminta persetujuan administrator atau belum menyelesaikan initial setup, buka Docker Desktop satu kali secara manual lalu ulangi perintah. Tekan `Ctrl+C` untuk menghentikan development server. Container dapat dihentikan kemudian dengan `npm run infra:down`.

API: `http://127.0.0.1:3200/api`; Swagger development: `http://127.0.0.1:3200/docs`; web: `http://localhost:5173`; Expo: `http://localhost:8081`; PostgreSQL PFRAM: `localhost:5433`; MinIO API: `http://localhost:9000`; MinIO Console: `http://localhost:9001`.

Android emulator memakai `EXPO_PUBLIC_API_URL=http://10.0.2.2:3200/api`. Untuk perangkat fisik, ganti dengan IP LAN komputer, misalnya `http://192.168.1.10:3200/api`.

## Environment dan keamanan

`.env.example` hanya berisi nilai development yang diberi label. Ganti seluruh password dan secret sebelum deployment. Jangan pernah commit `.env`. Di production wajib gunakan HTTPS, CORS allowlist eksplisit, `COOKIE_SECURE=true`, secret acak minimal 32 karakter, private MinIO bucket, reverse proxy dengan security headers, dan pengelolaan secret platform.

Web menyimpan access token singkat di memori dan refresh session pada cookie HttpOnly; refresh/logout dilindungi token CSRF. Mobile menyimpan refresh token di Expo SecureStore dan access token di memori. Database hanya menyimpan hash refresh token dan hash bcrypt password.

## Akun development only

Nilai default berikut dapat diubah melalui `.env` dan tidak boleh digunakan pada production:

| Peran | Nomor HP       | Kata sandi       |
| ----- | -------------- | ---------------- |
| Admin | `628111111111` | `AdminDev123!`   |
| Bidan | `628122222222` | `MidwifeDev123!` |
| Ibu   | `628133333333` | `MotherDev123!`  |

Seed juga membuat hierarki wilayah pilot, Puskesmas Pilot PFRAM, profil lengkap ketiga peran, satu kehamilan aktif development, dan satu penugasan bidan development. Semua nama ditandai sebagai data development dan seed aman dijalankan ulang.

## Menjalankan service secara terpisah

Jika diperlukan untuk debugging:

```powershell
npm run dev:api
npm run dev:web
npm run dev:mobile
```

## Pemeriksaan

```powershell
npm run typecheck
npm run lint
npm run test
npm run build:web
npm run build:api
npm run verify
```

`npm run infra:down` menghentikan container tanpa menghapus volume. PostgreSQL memakai port host `5433` agar tidak berbenturan dengan instalasi PostgreSQL Windows pada port `5432`. Jika port 5433/9000/9001 sudah digunakan, ubah pemetaan port dan `DATABASE_URL`. Jika Docker menolak akses konfigurasi pada Windows, pastikan Docker Desktop berjalan dan terminal memiliki akses ke profil Docker pengguna.

Build APK/EAS final dilakukan pada tahap rilis berikutnya. Untuk saat ini validasi dengan Expo Go/emulator melalui `npm run dev:mobile`.
