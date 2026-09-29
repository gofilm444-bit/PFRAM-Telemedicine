# Rencana pengujian fondasi

Otomatisasi awal mencakup health, readiness yang gagal aman tanpa database, penolakan `/auth/me` tanpa token, komponen error web, typecheck, lint, dan build. Pengujian integrasi dengan PostgreSQL mencakup register duplikat, password lemah, login, lockout, status disabled, rotasi token, logout, kebocoran field sensitif, audit, dan role access.

Smoke test manual: jalankan infrastruktur, migrasi + seed, buka health dan Swagger, login admin/bidan, registrasi ibu, periksa 403 lintas role, lalu buka onboarding/login/logout pada Expo Go atau emulator.

Test komponen React Native belum diaktifkan pada fondasi ini karena perubahan besar Testing Library pada React Native 0.86/React 19. Typecheck dan Metro Android export tetap wajib lulus; test auth gate, logout, dan tab navigation harus ditambahkan setelah harness native distabilkan.
