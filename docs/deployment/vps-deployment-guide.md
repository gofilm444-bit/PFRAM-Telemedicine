# Panduan Deployment Tunggal (Single-VPS) — PFRAM Telemedicine

Dokumen ini merupakan panduan implementasi produksi resmi untuk men-deploy seluruh ekosistem **PFRAM Telemedicine** (API Backend Fastify, Web SPA Vite untuk Bidan dan Administrator, PostgreSQL 16, dan MinIO S3 Object Storage) pada **1 Virtual Private Server (VPS)** berbasis Ubuntu 22.04 LTS / 24.04 LTS.

---

## 1. Topologi & Arsitektur Jaringan Produksi

```mermaid
graph TD
    UserClient[Pengguna: Mobile Ibu & Web Bidan/Admin] -->|HTTPS Port 443| Nginx[Nginx Reverse Proxy & SSL Termination]

    subgraph VPS["Single VPS (Minimal 2 vCPU / 4 GB RAM)"]
        Nginx -->|Sajikan Berkas Statis /var/www/pfram/apps/web/dist| WebSPA[Web SPA Vite (Bidan & Admin)]
        Nginx -->|Proxy Pass http://127.0.0.1:3200| NodeAPI[PFRAM Fastify API (PM2 Cluster Mode)]
        Nginx -->|Proxy Pass http://127.0.0.1:9000 (Opsional)| MinIOS3[MinIO S3 Private Storage]

        NodeAPI -->|Port 5432 (Internal Localhost)| Postgres[(PostgreSQL 16)]
        NodeAPI -->|S3 Protocol (Port 9000 Internal)| MinIOS3
    end

    classDef secured fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    class VPS secured;
```

### Pemetaan Port Internal & Eksternal
> [!IMPORTANT]
> **Port API internal sistem adalah 3200**. Dilarang keras menggunakan port 3000 untuk menghindari konflik dengan tool sistem lain atau konfigurasi bawaan.

| Komponen | Binding Host & Port | Akses Publik Firewall | Keterangan |
|---|---|---|---|
| **Nginx HTTP** | `0.0.0.0:80` | Terbuka (Public) | Let's Encrypt ACME & 301 Redirect ke HTTPS |
| **Nginx HTTPS** | `0.0.0.0:443` | Terbuka (Public) | Pintu masuk utama Web SPA dan API Backend |
| **SSH Server** | `0.0.0.0:22` | Terbuka (Public / Terbatas IP) | Akses administrasi server |
| **API Backend PFRAM** | `127.0.0.1:3200` | **TERTUTUP (Internal Saja)** | Fastify HTTP server yang dikelola PM2 |
| **PostgreSQL 16** | `127.0.0.1:5432` | **TERTUTUP (Internal Saja)** | Database relasional PFRAM |
| **MinIO S3 API** | `127.0.0.1:9000` | **TERTUTUP (Internal Saja)** | Penyimpanan privat berkas telekonsultasi |
| **MinIO Console** | `127.0.0.1:9001` | **TERTUTUP (Internal Saja)** | Web GUI MinIO (Akses via SSH Tunnel) |

### Rekomendasi Subdomain
- Portal Web Bidan & Admin: `pfram.example.com`
- API Backend: `api.pfram.example.com`

---

## 2. Persyaratan Minimal Server
- **Sistem Operasi:** Ubuntu 22.04 LTS atau Ubuntu 24.04 LTS (64-bit)
- **CPU:** Minimal 2 vCPU
- **RAM:** Minimal 4 GB (Disarankan membuat Swap 2 GB)
- **Penyimpanan:** Minimal 40 GB NVMe / SSD
- **Akses Root:** Hak akses `sudo` penuh

---

## 3. Langkah Instalasi Sistem & Dependensi

### Langkah 3.1: Konfigurasi Awal Sistem & Swap
Masuk melalui SSH ke server VPS:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip build-essential ufw logrotate

# Buat file Swap 2 GB jika RAM pas-pasan
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
```

### Langkah 3.2: Instalasi Node.js 20 LTS & PM2
Gunakan repositori resmi NodeSource:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi versi Node.js dan npm
node -v   # Harus v20.x.x
npm -v

# Pasang PM2 secara global
sudo npm install -g pm2
```

### Langkah 3.3: Instalasi & Konfigurasi PostgreSQL 16
```bash
# Tambahkan repositori PGDG resmi
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16

# Buat user dan database produksi
sudo -u postgres psql << EOF
CREATE USER pfram_prod WITH ENCRYPTED PASSWORD 'ISI_PASSWORD_POSTGRES_PRODUKSI';
CREATE DATABASE pfram_prod OWNER pfram_prod;
GRANT ALL PRIVILEGES ON DATABASE pfram_prod TO pfram_prod;
\c pfram_prod
GRANT ALL ON SCHEMA public TO pfram_prod;
EOF
```

Pastikan PostgreSQL hanya mendengarkan pada `localhost` di `/etc/postgresql/16/main/postgresql.conf`:
```text
listen_addresses = 'localhost'
```
Mulai ulang layanan PostgreSQL:
```bash
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

### Langkah 3.4: Instalasi & Konfigurasi MinIO (Object Storage Privat)
```bash
# Unduh binary MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
sudo chmod +x minio
sudo mv minio /usr/local/bin/

# Buat user sistem dan direktori data
sudo useradd -r minio-user -s /sbin/nologin || true
sudo mkdir -p /var/minio/data/pfram-private
sudo chown -R minio-user:minio-user /var/minio
sudo chmod -R 750 /var/minio

# Konfigurasi environment MinIO di /etc/default/minio
sudo bash -c 'cat << "EOF" > /etc/default/minio
MINIO_VOLUMES="/var/minio/data"
MINIO_OPTS="--address 127.0.0.1:9000 --console-address 127.0.0.1:9001"
MINIO_ROOT_USER="pfram_minio_admin"
MINIO_ROOT_PASSWORD="ISI_PASSWORD_MINIO_PRODUKSI_YANG_KUAT"
EOF'
sudo chmod 600 /etc/default/minio

# Buat systemd service unit di /etc/systemd/system/minio.service
sudo bash -c 'cat << "EOF" > /etc/systemd/system/minio.service
[Unit]
Description=MinIO Object Storage for PFRAM
Documentation=https://docs.min.io
Wants=network-online.target
After=network-online.target

[Service]
User=minio-user
Group=minio-user
EnvironmentFile=/etc/default/minio
ExecStart=/usr/local/bin/minio server $MINIO_OPTS $MINIO_VOLUMES
Restart=always
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF'

# Aktifkan dan jalankan MinIO
sudo systemctl daemon-reload
sudo systemctl enable --now minio
sudo systemctl status minio --no-pager
```

---

## 4. Setup Kode Sumber Aplikasi PFRAM

### Langkah 4.1: Clone Repositori & Instalasi Dependensi
```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone <URL_REPOSITORI_PFRAM> pfram
cd /var/www/pfram
sudo chown -R $USER:$USER /var/www/pfram

# Install seluruh dependensi monorepo secara deterministik
npm ci
```

### Langkah 4.2: Pembuatan File `.env.production`
Buat file konfigurasi `.env` pada root repositori (`/var/www/pfram/.env`):
```bash
cat << 'EOF' > /var/www/pfram/.env
# ==============================================================================
# PFRAM TELEMEDICINE — PRODUCTION ENVIRONMENT VARIABLES
# ==============================================================================
NODE_ENV=production
HOST="127.0.0.1"
PORT=3200

# Konfigurasi Database PostgreSQL Produksi
DATABASE_URL="postgresql://pfram_prod:ISI_PASSWORD_POSTGRES_PRODUKSI@127.0.0.1:5432/pfram_prod?schema=public"

# Rahasia JWT (Minimal 32 karakter acak yang kuat)
JWT_ACCESS_SECRET="GENERATE_STRING_ACAK_KUAT_MIN_32_KARAKTER_UNTUK_ACCESS"
JWT_REFRESH_SECRET="GENERATE_STRING_ACAK_KUAT_MIN_32_KARAKTER_UNTUK_REFRESH"
ACCESS_TOKEN_TTL="15m"
REFRESH_TOKEN_DAYS=7

# Keamanan Cookie & CORS
COOKIE_SECURE="true"
CORS_ORIGINS="https://pfram.example.com"

# Konfigurasi MinIO Private S3 Storage (Internal Binding)
MINIO_ENDPOINT="http://127.0.0.1:9000"
MINIO_BUCKET="pfram-private"
MINIO_ROOT_USER="pfram_minio_admin"
MINIO_ROOT_PASSWORD="ISI_PASSWORD_MINIO_PRODUKSI_YANG_KUAT"
EOF

chmod 600 /var/www/pfram/.env
```

> [!TIP]
> String acak untuk JWT Secret dapat dibuat dengan: `openssl rand -hex 32`

### Langkah 4.3: Eksekusi Migrasi Database (Prisma Migrate Deploy)
> [!IMPORTANT]
> Di lingkungan produksi, selalu gunakan `npx prisma migrate deploy`. **JANGAN** gunakan `prisma db push` atau `prisma migrate dev`.

```bash
cd /var/www/pfram
npm run db:generate
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

### Langkah 4.4: Inisialisasi Akun Produksi vs Data Demo
> [!CAUTION]
> **Pemisahan Tegas Data Demo vs Produksi:**
> - Skrip `apps/api/prisma/seed.ts` merupakan **development/demo seed** yang dilindungi oleh pengecekan:
>   `if (process.env.NODE_ENV === "production") throw new Error(...)`
> - **DILARANG** menjalankan development seed pada database produksi!

Untuk inisialisasi akun Administrator utama di produksi, buat pengguna administratif awal menggunakan skrip CLI atau query PostgreSQL terarah:

```bash
# Contoh pembuatan akun admin produksi pertama melalui script bantuan CLI
node -e '
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const phone = "6281299999999"; // Ganti dengan nomor HP Admin Produksi
  const pass = "PasswordAdminKuat123!"; // Ganti dengan password kuat
  const hash = await bcrypt.hash(pass, 12);
  const user = await prisma.user.create({
    data: {
      phoneNumber: phone,
      passwordHash: hash,
      role: "ADMIN",
      status: "ACTIVE",
      adminProfile: {
        create: { fullName: "Administrator Sistem PFRAM" }
      }
    }
  });
  console.log("Admin produksi berhasil diinisialisasi:", user.phoneNumber);
}
main().catch(console.error).finally(() => prisma.$disconnect());
'
```

### Langkah 4.5: Build Aplikasi Web & Backend API
```bash
cd /var/www/pfram
npm run build:api
npm run build:web
```
Hasil build:
- API dist: `/var/www/pfram/apps/api/dist/server.js`
- Web SPA dist: `/var/www/pfram/apps/web/dist`

---

## 5. Manajemen Proses Backend dengan PM2

Buat file konfigurasi ekosistem PM2 di `/var/www/pfram/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: "pfram-api",
      script: "apps/api/dist/server.js",
      cwd: "/var/www/pfram",
      instances: 2,               // Mode cluster (sesuai jumlah vCPU)
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/var/log/pfram/api-error.log",
      out_file: "/var/log/pfram/api-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
```

Buat direktori log dan jalankan API:
```bash
sudo mkdir -p /var/log/pfram
sudo chown -R $USER:$USER /var/log/pfram

pm2 start ecosystem.config.cjs
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
```

Verifikasi proses API berjalan:
```bash
pm2 status
curl -s http://127.0.0.1:3200/api/health | jq .
```
Respon yang diharapkan:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "pfram-api",
    "version": "0.1.0"
  }
}
```

---

## 6. Konfigurasi Nginx & HTTPS Let's Encrypt

### Langkah 6.1: Konfigurasi Nginx untuk Web Frontend & API
Buat file virtual host Nginx di `/etc/nginx/sites-available/pfram.conf`:

```nginx
# ------------------------------------------------------------------------------
# 1. Web Portal Bidan & Admin (pfram.example.com)
# ------------------------------------------------------------------------------
server {
    listen 80;
    server_name pfram.example.com;

    root /var/www/pfram/apps/web/dist;
    index index.html;

    # Single Page Application (SPA) routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}

# ------------------------------------------------------------------------------
# 2. API Backend Fastify (api.pfram.example.com)
# ------------------------------------------------------------------------------
server {
    listen 80;
    server_name api.pfram.example.com;

    client_max_body_size 25M; # Batas maksimum unggahan foto & voice note

    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan konfigurasi Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/pfram.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Langkah 6.2: Penerbitan Sertifikat SSL Let's Encrypt
Pasang Certbot dan dapatkan sertifikat SSL gratis:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pfram.example.com -d api.pfram.example.com
```
Pilih opsi pengalihan otomatis seluruh lalu lintas HTTP ke HTTPS (301 Redirect).

---

## 7. Keamanan Firewall (UFW)

Aktifkan UFW dan izinkan hanya port yang diperlukan publik:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Izinkan SSH, HTTP, dan HTTPS
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP Let's Encrypt'
sudo ufw allow 443/tcp comment 'HTTPS Production'

# Pastikan port internal (3200, 5432, 9000, 9001) TIDAK dibuka ke publik
sudo ufw enable
sudo ufw status verbose
```

---

## 8. Verifikasi Operasional & Health Check

Setelah seluruh konfigurasi selesai:

1. **Uji Liveness Endpoint API:**
   ```bash
   curl -I https://api.pfram.example.com/api/health
   # Respon yang diharapkan: HTTP/2 200 OK
   ```

2. **Uji Readiness Database:**
   ```bash
   curl -s https://api.pfram.example.com/api/health/ready | jq .
   # Respon yang diharapkan: { "success": true, "data": { "database": "up" } }
   ```

3. **Uji Akses Web Portal:**
   Buka `https://pfram.example.com` pada browser. Pastikan aplikasi me-render tampilan login bidan/admin dengan styling Tailwind penuh tanpa error konsol.

4. **Uji Status PM2:**
   ```bash
   pm2 list
   ```

---

## 9. Logging & Pemeliharaan Log

Konfigurasikan modul `pm2-logrotate` agar file log tidak memenuhi kapasitas disk:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
```

---

## 10. Prosedur Pembaruan Rilis (Deployment Update)

Untuk merilis pembaruan kode baru dari repositori Git tanpa mengganggu database:

```bash
cd /var/www/pfram

# 1. Tarik pembaruan kode terbaru
git pull origin main

# 2. Install dependensi baru jika ada perubahan
npm ci

# 3. Jalankan migrasi database
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

# 4. Kompilasi ulang backend dan frontend
npm run build:api
npm run build:web

# 5. Muat ulang PM2 tanpa downtime (Zero-Downtime Reload)
pm2 reload ecosystem.config.cjs --update-env

# 6. Salin atau pastikan Nginx membaca build web terbaru
sudo systemctl reload nginx

# 7. Verifikasi kesehatan
curl -s https://api.pfram.example.com/api/health/ready | jq .
```

---

## 11. Prosedur Rollback Darurat

Jika rilis baru mengalami kendala kritis pada produksi:

1. **Rollback Kode Sumber ke Tag / Commit Sebelumnya:**
   ```bash
   cd /var/www/pfram
   git checkout <TAG_ATAU_COMMIT_SEBELUMNYA>
   npm ci
   npm run build:api
   npm run build:web
   ```

2. **Muat Ulang Layanan API:**
   ```bash
   pm2 restart pfram-api
   ```

3. **Pemulihan Database (Bila Ada Skema Breaking Changes):**
   Gunakan file cadangan snapshot yang dibuat sebelum rilis mengikuti panduan [backup-restore.md](file:///d:/app/PFRAM%20Telemedicine/docs/deployment/backup-restore.md).
