# Autentikasi dan otorisasi

Kata sandi di-hash dengan bcrypt cost 12. Access JWT berumur pendek dan hanya disimpan di memori client. Refresh token opaque acak disimpan sebagai SHA-256 hash di PostgreSQL, dirotasi setiap refresh, dan dicabut saat logout.

Web memakai refresh cookie HttpOnly, SameSite Strict, Secure pada production, ditambah double-submit CSRF token dengan perbandingan constant-time. Mobile memakai Expo SecureStore. Lima kegagalan login mengunci akun selama 15 menit. Role `MOTHER`, `MIDWIFE`, dan `ADMIN` diperiksa di backend; route guard frontend hanya untuk UX.

Log meredaksi authorization, cookie, password, token, dan nomor HP. Metadata audit disaring sebelum ditulis.
