# Arsitektur dan Alur Pemantauan Fisik Mandiri (Tahap 4A)

## 1. Diagram Alur Pencatatan Monitoring

```mermaid
sequenceDiagram
    autonumber
    actor Mother as Ibu Hamil
    participant API as Fastify API
    participant RBAC as Authorization Hook
    participant DB as PostgreSQL
    participant Audit as AuditLog

    Mother->>API: POST /api/mother/monitoring (weight, BP, source)
    API->>RBAC: Verifikasi Role (MOTHER)
    RBAC-->>API: Authorized
    API->>DB: Validasi Kehamilan Aktif (Pregnancy.status == ACTIVE)
    alt Kehamilan Aktif Valid
        API->>DB: INSERT into MonitoringEntry
        API->>Audit: Log Event MONITORING_CREATED
        API-->>Mother: 201 Created (publicId, nilai terukur)
    else Tidak Ada Kehamilan Aktif
        API-->>Mother: 400 Bad Request (NO_ACTIVE_PREGNANCY)
    end
```

## 2. Diagram Alur Akses Bidan Pendamping

```mermaid
sequenceDiagram
    autonumber
    actor Midwife as Bidan Pendamping
    participant API as Fastify API
    participant RBAC as Authorization Hook
    participant DB as PostgreSQL
    participant Audit as AuditLog

    Midwife->>API: GET /api/midwife/mothers/:motherPublicId/monitoring
    API->>RBAC: Verifikasi Role (MIDWIFE)
    RBAC-->>API: Authorized
    API->>DB: Cek MotherMidwifeAssignment (status == ACTIVE)
    alt Assignment Aktif Ada
        API->>DB: Query non-archived MonitoringEntry
        API->>Audit: Log Event MONITORING_VIEWED_BY_MIDWIFE
        API-->>Midwife: 200 OK (Daftar Catatan)
    else Tidak Ada Assignment Aktif
        API-->>Midwife: 404 Not Found (MOTHER_NOT_ASSIGNED)
    end
```

## 3. Prinsip Keamanan & Desain Data
1. **Zero Clinical Diagnostic Leaks**: Pada Tahap 4A, backend murni berfungsi sebagai pencatat fakta pengukuran. Tidak ada aturan klinis otomatis, tidak ada diagnosis hipertensi, preeklamsia, atau status gizi.
2. **Strict Role Isolation**:
   - `MOTHER`: Memiliki isolasi penuh berbasis `userId` pada token JWT.
   - `MIDWIFE`: Hanya memiliki akses ke ibu binaan dengan penugasan `ACTIVE`.
   - `ADMIN`: Akses monitoring ditolak untuk menjaga privasi medis.
3. **Data Immutability & Audit Trail**:
   - Tidak ada penghapusan permanen dari database (`archivedAt` timestamp digunakan).
   - Setiap mutasi dicatat dalam tabel `AuditLog` dengan metadata ringkas dan aman.
