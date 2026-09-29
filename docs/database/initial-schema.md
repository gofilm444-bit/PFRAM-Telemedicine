# Schema database awal

Migration `20260806000000_initial` membuat `User`, tiga tabel profil berbasis role, `RefreshSession`, `ConsentDocument`, `UserConsent`, `AuditLog`, dan `SystemSetting`. Primary key internal adalah UUID. `publicId` terpisah digunakan untuk representasi publik.

Index meliputi role/status pengguna, penguncian, sesi aktif/kedaluwarsa, dokumen persetujuan aktif, serta pencarian audit. Seed bersifat idempotent dan hanya diizinkan di luar production.
