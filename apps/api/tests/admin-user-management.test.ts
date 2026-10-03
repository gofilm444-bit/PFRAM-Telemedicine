import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

describe("Admin User Account Management API Suite", () => {
  let app: ReturnType<typeof buildApp>;
  let prisma: PrismaClient;

  let adminToken: string;
  let midwifeToken: string;
  let motherToken: string;

  let adminPublicId: string;

  const testPhones = [
    "628999888001",
    "628999888002",
    "628999888003",
  ];

  beforeAll(async () => {
    const env = {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ||
        process.env.DATABASE_URL ||
        "postgresql://pfram:pfram_dev_only@localhost:5433/pfram_test?schema=public",
      JWT_ACCESS_SECRET:
        process.env.JWT_ACCESS_SECRET ||
        "development-access-secret-change-me-at-least-32-characters",
      JWT_REFRESH_SECRET:
        process.env.JWT_REFRESH_SECRET ||
        "development-refresh-secret-change-me-at-least-32-characters",
      CORS_ORIGINS: "http://localhost:5173",
      COOKIE_SECURE: "false",
    };
    prisma = new PrismaClient({
      datasources: { db: { url: env.DATABASE_URL } },
    });
    app = buildApp({ env, prisma });
    await app.ready();

    // Clean up any leftovers from previous runs
    await prisma.user.deleteMany({
      where: { phoneNumber: { in: testPhones } },
    });

    // Query seeded entities
    const admin = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628111111111" },
    });
    adminPublicId = admin.publicId;

    const midwife = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628122222222" },
    });

    const mother = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628133333333" },
    });

    adminToken = app.jwt.sign({
      sub: admin.id,
      publicId: admin.publicId,
      role: "ADMIN",
    });

    midwifeToken = app.jwt.sign({
      sub: midwife.id,
      publicId: midwife.publicId,
      role: "MIDWIFE",
    });

    motherToken = app.jwt.sign({
      sub: mother.id,
      publicId: mother.publicId,
      role: "MOTHER",
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { phoneNumber: { in: testPhones } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe("1. Access Control", () => {
    it("menolak akses tanpa token (401)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/users",
      });
      expect(res.statusCode).toBe(401);
    });

    it("menolak peran MIDWIFE mengakses manajemen akun (403)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/users",
        headers: { authorization: `Bearer ${midwifeToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it("menolak peran MOTHER mengakses manajemen akun (403)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/users",
        headers: { authorization: `Bearer ${motherToken}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe("2. User Listing & Filtering", () => {
    it("admin dapat mengambil daftar akun pengguna dengan metadata aman", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/users",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.items)).toBe(true);
      expect(json.data.total).toBeGreaterThanOrEqual(1);

      const firstItem = json.data.items[0];
      expect(firstItem).toHaveProperty("publicId");
      expect(firstItem).toHaveProperty("phoneNumber");
      expect(firstItem).toHaveProperty("role");
      expect(firstItem).toHaveProperty("status");
      expect(firstItem).toHaveProperty("displayName");
      expect(firstItem).toHaveProperty("isLocked");
      expect(firstItem).toHaveProperty("createdAt");

      // Verifikasi TIDAK ADA kebocoran passwordHash atau token
      expect(firstItem).not.toHaveProperty("passwordHash");
      expect(firstItem).not.toHaveProperty("refreshToken");
      expect(firstItem).not.toHaveProperty("hashedRefreshToken");
    });

    it("dapat diakses juga melalui route alias /api/users", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/users",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it("mendukung filter berdasarkan role dan status", async () => {
      const resRole = await app.inject({
        method: "GET",
        url: "/api/admin/users?role=MIDWIFE",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(resRole.statusCode).toBe(200);
      const midwifeItems = resRole.json().data.items;
      expect(midwifeItems.every((i: { role: string }) => i.role === "MIDWIFE")).toBe(true);

      const resStatus = await app.inject({
        method: "GET",
        url: "/api/admin/users?status=ACTIVE",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(resStatus.statusCode).toBe(200);
      const activeItems = resStatus.json().data.items;
      expect(activeItems.every((i: { status: string }) => i.status === "ACTIVE")).toBe(true);
    });

    it("mendukung pencarian berdasarkan nomor HP", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/users?search=628111111111",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      const items = res.json().data.items;
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items[0].phoneNumber).toBe("628111111111");
    });
  });

  describe("3. Create User Account (Admin & Midwife)", () => {
    it("menolak pembuatan akun dengan input tidak valid (400)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/users",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          phoneNumber: "invalid",
          password: "123",
          role: "ADMIN",
          fullName: "",
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("admin dapat membuat akun ADMIN baru dengan AdminProfile", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/users",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          phoneNumber: "628999888001",
          password: "AdminPassword123!",
          role: "ADMIN",
          fullName: "Admin Operasional Uji",
        },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.phoneNumber).toBe("628999888001");
      expect(body.data.role).toBe("ADMIN");
      expect(body.data.displayName).toBe("Admin Operasional Uji");
      expect(body.data.status).toBe("ACTIVE");

      // Verifikasi di DB bahwa AdminProfile terbentuk
      const created = await prisma.user.findUnique({
        where: { phoneNumber: "628999888001" },
        include: { adminProfile: true },
      });
      expect(created).not.toBeNull();
      expect(created?.adminProfile?.fullName).toBe("Admin Operasional Uji");

      // Verifikasi audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityId: created!.id,
          action: "USER_CREATED",
        },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.result).toBe("SUCCESS");
    });

    it("menolak nomor HP yang sudah terdaftar (409)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/users",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          phoneNumber: "628999888001",
          password: "AdminPassword123!",
          role: "ADMIN",
          fullName: "Admin Duplikat",
        },
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("PHONE_ALREADY_EXISTS");
    });

    it("admin dapat membuat akun MIDWIFE baru secara atomik dengan MidwifeProfile", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/users",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          phoneNumber: "628999888002",
          password: "MidwifePassword123!",
          role: "MIDWIFE",
          fullName: "Bidan Desa Uji",
          professionalRegistrationNumber: "STR-BIDAN-999002",
        },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.phoneNumber).toBe("628999888002");
      expect(body.data.role).toBe("MIDWIFE");
      expect(body.data.displayName).toBe("Bidan Desa Uji");

      // Verifikasi di DB bahwa MidwifeProfile terbentuk
      const created = await prisma.user.findUnique({
        where: { phoneNumber: "628999888002" },
        include: { midwifeProfile: true },
      });
      expect(created).not.toBeNull();
      expect(created?.midwifeProfile?.fullName).toBe("Bidan Desa Uji");
      expect(created?.midwifeProfile?.professionalRegistrationNumber).toBe("STR-BIDAN-999002");
      expect(created?.midwifeProfile?.active).toBe(true);
    });
  });

  describe("4. Account Details & Lifecycle (Activate, Deactivate, Unlock, Reset Password)", () => {
    let targetMidwifePublicId: string;
    let targetMidwifeId: string;

    beforeAll(async () => {
      const midwifeUser = await prisma.user.findUniqueOrThrow({
        where: { phoneNumber: "628999888002" },
      });
      targetMidwifePublicId = midwifeUser.publicId;
      targetMidwifeId = midwifeUser.id;
    });

    it("admin dapat melihat detail akun pengguna", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/admin/users/${targetMidwifePublicId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.publicId).toBe(targetMidwifePublicId);
      expect(data.phoneNumber).toBe("628999888002");
      expect(data.displayName).toBe("Bidan Desa Uji");
      expect(data.midwifeProfile?.professionalRegistrationNumber).toBe("STR-BIDAN-999002");
    });

    it("mencegah admin menonaktifkan akunnya sendiri (400)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/users/${adminPublicId}/deactivate`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("CANNOT_DEACTIVATE_SELF");
    });

    it("admin dapat menonaktifkan akun bidan (status DISABLED & midwifeProfile.active false)", async () => {
      // Create a mock refresh session to verify revocation
      await prisma.refreshSession.create({
        data: {
          userId: targetMidwifeId,
          tokenHash: "dummy-session-token",
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const res = await app.inject({
        method: "POST",
        url: `/api/admin/users/${targetMidwifePublicId}/deactivate`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe("DISABLED");

      // Verifikasi di DB
      const updated = await prisma.user.findUnique({
        where: { id: targetMidwifeId },
        include: { midwifeProfile: true, refreshSessions: true },
      });
      expect(updated?.status).toBe("DISABLED");
      expect(updated?.deactivatedAt).not.toBeNull();
      expect(updated?.midwifeProfile?.active).toBe(false);
      expect(updated?.refreshSessions.length).toBe(0); // Sesi dicabut

      // Verifikasi audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: { entityId: targetMidwifeId, action: "USER_DEACTIVATED" },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.result).toBe("SUCCESS");
    });

    it("admin dapat mengaktifkan kembali akun bidan", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/users/${targetMidwifePublicId}/activate`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe("ACTIVE");

      const updated = await prisma.user.findUnique({
        where: { id: targetMidwifeId },
        include: { midwifeProfile: true },
      });
      expect(updated?.status).toBe("ACTIVE");
      expect(updated?.deactivatedAt).toBeNull();
      expect(updated?.midwifeProfile?.active).toBe(true);

      const auditLog = await prisma.auditLog.findFirst({
        where: { entityId: targetMidwifeId, action: "USER_ACTIVATED" },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.result).toBe("SUCCESS");
    });

    it("admin dapat membuka kunci akun yang terkunci", async () => {
      // Simulasikan lockout
      await prisma.user.update({
        where: { id: targetMidwifeId },
        data: {
          failedLoginCount: 5,
          lockedUntil: new Date(Date.now() + 3600000),
        },
      });

      // Verifikasi sebelum unlock isLocked bernilai true
      const detailRes = await app.inject({
        method: "GET",
        url: `/api/admin/users/${targetMidwifePublicId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(detailRes.json().data.isLocked).toBe(true);

      // Jalankan unlock
      const unlockRes = await app.inject({
        method: "POST",
        url: `/api/admin/users/${targetMidwifePublicId}/unlock`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(unlockRes.statusCode).toBe(200);
      expect(unlockRes.json().data.isLocked).toBe(false);

      const updated = await prisma.user.findUnique({
        where: { id: targetMidwifeId },
      });
      expect(updated?.failedLoginCount).toBe(0);
      expect(updated?.lockedUntil).toBeNull();

      const auditLog = await prisma.auditLog.findFirst({
        where: { entityId: targetMidwifeId, action: "USER_UNLOCKED" },
      });
      expect(auditLog).not.toBeNull();
    });

    it("admin dapat mereset kata sandi akun pengguna", async () => {
      const newPass = "NewSecurePassword456!";
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/users/${targetMidwifePublicId}/reset-password`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { newPassword: newPass },
      });
      expect(res.statusCode).toBe(200);

      // Verifikasi hash di DB cocok dengan kata sandi baru
      const updated = await prisma.user.findUnique({
        where: { id: targetMidwifeId },
      });
      const match = await bcrypt.compare(newPass, updated!.passwordHash);
      expect(match).toBe(true);

      const auditLog = await prisma.auditLog.findFirst({
        where: { entityId: targetMidwifeId, action: "USER_PASSWORD_RESET" },
      });
      expect(auditLog).not.toBeNull();
    });
  });
});
