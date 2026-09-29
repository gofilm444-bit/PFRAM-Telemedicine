# Ikhtisar arsitektur

Monorepo npm workspaces memisahkan mobile, web, API, dan paket lintas platform. Semua frontend hanya berkomunikasi dengan REST API; tidak ada koneksi langsung ke PostgreSQL atau MinIO. API menjadi trust boundary untuk validasi, autentikasi, otorisasi, audit, dan akses data.

Fondasi ini belum mengandung logika atau klaim klinis. Folder registrasi lanjutan dan tab mobile adalah placeholder aman untuk Tahap 3.
