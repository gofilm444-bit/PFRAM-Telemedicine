# Setup development

Pastikan Docker Desktop aktif, lalu jalankan `npm run dev` dari root repository. Script akan menyiapkan environment development, menunggu container sehat, menjalankan generate/migration/seed, dan membuka ketiga aplikasi. File `.env` yang sudah ada tidak pernah ditimpa.

Untuk reset data development gunakan operasi Prisma/Docker yang sesuai dengan sengaja; jangan menghapus volume tanpa cadangan jika berisi data yang perlu dipertahankan.

MinIO bootstrap membuat bucket `pfram-private` secara idempotent dan menetapkan anonymous access ke `none`.

PostgreSQL container diekspos melalui port host `5433`, bukan `5432`, untuk menghindari konflik dengan service PostgreSQL Windows yang mungkin sudah terpasang.
