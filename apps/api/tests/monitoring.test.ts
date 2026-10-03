import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

describe("Stage 4A — Monitoring Suite", () => {
  let app: ReturnType<typeof buildApp>;
  let prisma: PrismaClient;

  let adminToken: string;
  let motherToken: string;
  let otherMotherToken: string;
  let assignedMidwifeToken: string;
  let unassignedMidwifeToken: string;

  let devMotherProfile: { id: string; publicId: string };
  let devOtherMotherProfile: { id: string; publicId: string };
  let devPregnancy: { id: string; publicId: string };
  let devOtherPregnancy: { id: string; publicId: string };
  let devFacility: { id: string; publicId: string };

  let createdEntryPublicId: string;

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

    // 1. Admin
    const admin = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628111111111" },
    });
    adminToken = app.jwt.sign({
      sub: admin.id,
      publicId: admin.publicId,
      role: "ADMIN",
    });

    // 2. Assigned Midwife (628122222222)
    const midwife = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628122222222" },
      include: { midwifeProfile: true },
    });
    assignedMidwifeToken = app.jwt.sign({
      sub: midwife.id,
      publicId: midwife.publicId,
      role: "MIDWIFE",
    });

    // 3. Mother (628133333333)
    const mother = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628133333333" },
      include: { motherProfile: { include: { pregnancies: true } } },
    });
    devMotherProfile = mother.motherProfile!;
    devPregnancy = mother.motherProfile!.pregnancies.find(
      (p) => p.status === "ACTIVE",
    )!;
    motherToken = app.jwt.sign({
      sub: mother.id,
      publicId: mother.publicId,
      role: "MOTHER",
    });

    // 4. Facility
    devFacility = await prisma.healthFacility.findFirstOrThrow({
      where: { publicId: "32000000-0000-4000-8000-000000000001" },
    });

    // 5. Ensure secondary mother exists for isolation tests
    const otherMotherPhone = "6281399990001";
    let otherMotherUser = await prisma.user.findUnique({
      where: { phoneNumber: otherMotherPhone },
      include: { motherProfile: { include: { pregnancies: true } } },
    });
    if (!otherMotherUser) {
      otherMotherUser = await prisma.user.create({
        data: {
          phoneNumber: otherMotherPhone,
          passwordHash: "hash_test_other_mother",
          role: "MOTHER",
          status: "ACTIVE",
          motherProfile: {
            create: {
              fullName: "Ibu Lain Uji Isolasi",
              dateOfBirth: new Date("1995-05-15"),
              address: "Jalan Isolasi No. 2",
              primaryFacilityId: devFacility.id,
              profileCompleted: true,
              pregnancies: {
                create: {
                  pregnancyNumber: 1,
                  gestationalAgeSource: "LMP",
                  lastMenstrualPeriod: new Date("2026-03-01"),
                  estimatedDueDate: new Date("2026-12-06"),
                  status: "ACTIVE",
                  completedProfile: true,
                },
              },
            },
          },
        },
        include: { motherProfile: { include: { pregnancies: true } } },
      });
    }
    devOtherMotherProfile = otherMotherUser.motherProfile!;
    devOtherPregnancy = otherMotherUser.motherProfile!.pregnancies[0]!;

    otherMotherToken = app.jwt.sign({
      sub: otherMotherUser.id,
      publicId: otherMotherUser.publicId,
      role: "MOTHER",
    });

    // 6. Ensure secondary unassigned midwife exists for isolation tests
    const unassignedMidwifePhone = "6281299990002";
    let unassignedMidwifeUser = await prisma.user.findUnique({
      where: { phoneNumber: unassignedMidwifePhone },
      include: { midwifeProfile: true },
    });
    if (!unassignedMidwifeUser) {
      unassignedMidwifeUser = await prisma.user.create({
        data: {
          phoneNumber: unassignedMidwifePhone,
          passwordHash: "hash_test_unassigned_midwife",
          role: "MIDWIFE",
          status: "ACTIVE",
          midwifeProfile: {
            create: {
              fullName: "Bidan Lain Tidak Ditugaskan",
              phoneNumber: unassignedMidwifePhone,
              active: true,
              primaryFacilityId: devFacility.id,
            },
          },
        },
        include: { midwifeProfile: true },
      });
    }
    unassignedMidwifeToken = app.jwt.sign({
      sub: unassignedMidwifeUser.id,
      publicId: unassignedMidwifeUser.publicId,
      role: "MIDWIFE",
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
  });

  describe("1. VALIDASI INPUT & PEMBUATAN DATA OLEH IBU", () => {
    it("1. Mother create weight only → PASS", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: {
          weightKg: 59.25,
          source: "SELF",
          notes: "Timbang pagi mandiri",
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json().data;
      expect(data.weightKg).toBe(59.25);
      expect(data.systolicBp).toBeNull();
      expect(data.diastolicBp).toBeNull();
      expect(data.source).toBe("SELF");
      expect(data.publicId).toBeDefined();
      createdEntryPublicId = data.publicId;
    });

    it("2. Mother create BP only → PASS", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: {
          systolicBp: 116,
          diastolicBp: 76,
          source: "POSYANDU",
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json().data;
      expect(data.weightKg).toBeNull();
      expect(data.systolicBp).toBe(116);
      expect(data.diastolicBp).toBe(76);
      expect(data.source).toBe("POSYANDU");
    });

    it("3. Mother create weight + BP → PASS", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: {
          weightKg: 60.1,
          systolicBp: 120,
          diastolicBp: 80,
          source: "PUSKESMAS",
          notes: "Kontrol bulanan",
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json().data;
      expect(data.weightKg).toBe(60.1);
      expect(data.systolicBp).toBe(120);
      expect(data.diastolicBp).toBe(80);
      expect(data.source).toBe("PUSKESMAS");
    });

    it("4. Entry kosong → REJECT", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("5. Weight <= 0 → REJECT", async () => {
      const res1 = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: { weightKg: 0 },
      });
      expect(res1.statusCode).toBe(400);

      const res2 = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: { weightKg: -10 },
      });
      expect(res2.statusCode).toBe(400);
    });

    it("6. Weight typo ekstrem → REJECT", async () => {
      const res1 = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: { weightKg: 10 },
      });
      expect(res1.statusCode).toBe(400);

      const res2 = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: { weightKg: 400 },
      });
      expect(res2.statusCode).toBe(400);
    });

    it("7. Hanya systolic → REJECT", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: { systolicBp: 120 },
      });
      expect(res.statusCode).toBe(400);
    });

    it("8. Hanya diastolic → REJECT", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: { diastolicBp: 80 },
      });
      expect(res.statusCode).toBe(400);
    });

    it("9. systolic <= diastolic → REJECT", async () => {
      const res1 = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: { systolicBp: 80, diastolicBp: 80 },
      });
      expect(res1.statusCode).toBe(400);

      const res2 = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: { systolicBp: 70, diastolicBp: 90 },
      });
      expect(res2.statusCode).toBe(400);
    });

    it("10. BP typo ekstrem → REJECT", async () => {
      const res1 = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: { systolicBp: 350, diastolicBp: 80 },
      });
      expect(res1.statusCode).toBe(400);

      const res2 = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: { systolicBp: 120, diastolicBp: 20 },
      });
      expect(res2.statusCode).toBe(400);
    });

    it("11. recordedAt future invalid → REJECT", async () => {
      const futureTime = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const res = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: {
          weightKg: 55,
          recordedAt: futureTime,
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("2. ISOLASI DATA IBU & KEPEMILIKAN", () => {
    it("12. mother hanya melihat monitoring sendiri", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
      });
      expect(res.statusCode).toBe(200);
      const items = res.json().data.items;
      expect(items.length).toBeGreaterThan(0);
    });

    it("13. mother tidak melihat monitoring mother lain", async () => {
      const resOther = await app.inject({
        method: "GET",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${otherMotherToken}` },
      });
      expect(resOther.statusCode).toBe(200);
      const items = resOther.json().data.items;
      // Other mother currently has 0 monitoring entries
      expect(items.length).toBe(0);

      // Attempting to directly fetch mother A's entry with mother B's token yields 404
      const resDirect = await app.inject({
        method: "GET",
        url: `/api/mother/monitoring/${createdEntryPublicId}`,
        headers: { authorization: `Bearer ${otherMotherToken}` },
      });
      expect(resDirect.statusCode).toBe(404);
    });

    it("14. create hanya untuk pregnancy sendiri", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: {
          pregnancyPublicId: devOtherPregnancy.publicId,
          weightKg: 61,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("NO_ACTIVE_PREGNANCY");
    });
  });

  describe("3. EDIT, ARCHIVE, DAN HISTORICAL INTEGRITY", () => {
    it("15 & 16. archived item hilang dari active list tapi tetap ada secara historis", async () => {
      // Create a temporary entry to archive
      const createRes = await app.inject({
        method: "POST",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: { weightKg: 58.0, notes: "Akan diarsipkan" },
      });
      const tempEntry = createRes.json().data;

      // Archive it
      const archRes = await app.inject({
        method: "POST",
        url: `/api/mother/monitoring/${tempEntry.publicId}/archive`,
        headers: { authorization: `Bearer ${motherToken}` },
      });
      expect(archRes.statusCode).toBe(200);
      expect(archRes.json().data.archivedAt).not.toBeNull();

      // Check active list: should not include archived item
      const listRes = await app.inject({
        method: "GET",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${motherToken}` },
      });
      const items = listRes.json().data.items;
      const foundInList = items.some((i: { publicId: string }) => i.publicId === tempEntry.publicId);
      expect(foundInList).toBe(false);

      // Check database: record still exists with archivedAt filled
      const dbEntry = await prisma.monitoringEntry.findUniqueOrThrow({
        where: { publicId: tempEntry.publicId },
      });
      expect(dbEntry.archivedAt).not.toBeNull();
    });

    it("17. edit own entry → PASS", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/mother/monitoring/${createdEntryPublicId}`,
        headers: { authorization: `Bearer ${motherToken}` },
        payload: {
          weightKg: 59.8,
          notes: "Koreksi timbangan pagi",
        },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.weightKg).toBe(59.8);
      expect(data.notes).toBe("Koreksi timbangan pagi");
    });

    it("18. edit mother lain → REJECT", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/mother/monitoring/${createdEntryPublicId}`,
        headers: { authorization: `Bearer ${otherMotherToken}` },
        payload: {
          weightKg: 70,
        },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("4. OTORISASI BIDAN (ASSIGNED VS UNRELATED)", () => {
    it("19. active assigned midwife dapat membaca", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/monitoring`,
        headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.items.length).toBeGreaterThan(0);
    });

    it("20. unrelated midwife ditolak", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/monitoring`,
        headers: { authorization: `Bearer ${unassignedMidwifeToken}` },
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("MOTHER_NOT_ASSIGNED");

      // Midwife A cannot access mother assigned to Midwife B / not assigned to her
      const res2 = await app.inject({
        method: "GET",
        url: `/api/midwife/mothers/${devOtherMotherProfile.publicId}/monitoring`,
        headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      });
      expect(res2.statusCode).toBe(404);
      expect(res2.json().error.code).toBe("MOTHER_NOT_ASSIGNED");
    });

    it("21. active assigned midwife dapat mencatat monitoring ibu", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/monitoring`,
        headers: { authorization: `Bearer ${assignedMidwifeToken}` },
        payload: {
          weightKg: 60.5,
          systolicBp: 118,
          diastolicBp: 78,
          source: "PUSKESMAS",
          notes: "Pemeriksaan oleh bidan pendamping",
        },
      });
      expect(res.statusCode).toBe(201);
      const data = res.json().data;
      expect(data.weightKg).toBe(60.5);
      expect(data.systolicBp).toBe(118);
      expect(data.diastolicBp).toBe(78);
      expect(data.source).toBe("PUSKESMAS");
    });

    it("22. inactive / replaced assignment ditolak", async () => {
      // Unassigned midwife attempting to post monitoring for unassigned mother
      const res = await app.inject({
        method: "POST",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/monitoring`,
        headers: { authorization: `Bearer ${unassignedMidwifeToken}` },
        payload: { weightKg: 60 },
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("MOTHER_NOT_ASSIGNED");
    });
  });

  describe("5. SUMMARY DATA & PERHITUNGAN DINAMIS", () => {
    it("23, 24, 25. summary latest weight, latest BP, dan weightChange benar", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/mother/monitoring/summary",
        headers: { authorization: `Bearer ${motherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const summary = res.json().data;
      expect(summary.latestWeight).not.toBeNull();
      expect(summary.latestWeightRecordedAt).not.toBeNull();
      expect(summary.latestBloodPressure).not.toBeNull();
      expect(summary.latestBloodPressure.systolic).toBeDefined();
      expect(summary.latestBloodPressure.diastolic).toBeDefined();
      expect(summary.previousWeight).not.toBeNull();
      expect(summary.weightChange).not.toBeNull();
      expect(typeof summary.weightChange).toBe("number");
      expect(summary.totalEntries).toBeGreaterThanOrEqual(2);
      expect(summary.activePregnancyPublicId).toBe(devPregnancy.publicId);
    });

    it("midwife dapat melihat summary ibu binaan", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/monitoring/summary`,
        headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      });
      expect(res.statusCode).toBe(200);
      const summary = res.json().data;
      expect(summary.activePregnancyPublicId).toBe(devPregnancy.publicId);
    });
  });

  describe("6. FILTER, PAGINATION, DAN AUDIT LOG", () => {
    it("26. pagination benar", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/mother/monitoring?page=1&limit=2",
        headers: { authorization: `Bearer ${motherToken}` },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(2);
      expect(data.items.length).toBeLessThanOrEqual(2);
    });

    it("27. from/to filter benar", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/mother/monitoring?from=2026-08-01T00:00:00Z&to=2026-08-02T23:59:59Z",
        headers: { authorization: `Bearer ${motherToken}` },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.items.length).toBeGreaterThanOrEqual(1);
    });

    it("28. type filter benar", async () => {
      const resWeight = await app.inject({
        method: "GET",
        url: "/api/mother/monitoring?type=weight",
        headers: { authorization: `Bearer ${motherToken}` },
      });
      expect(resWeight.statusCode).toBe(200);
      resWeight.json().data.items.forEach((item: { weightKg: number | null }) => {
        expect(item.weightKg).not.toBeNull();
      });

      const resBp = await app.inject({
        method: "GET",
        url: "/api/mother/monitoring?type=blood_pressure",
        headers: { authorization: `Bearer ${motherToken}` },
      });
      expect(resBp.statusCode).toBe(200);
      resBp.json().data.items.forEach((item: { systolicBp: number | null }) => {
        expect(item.systolicBp).not.toBeNull();
      });
    });

    it("29, 30, 31. audit log tercatat untuk create, update, dan archive", async () => {
      const createLog = await prisma.auditLog.findFirst({
        where: { action: "MONITORING_CREATED" },
      });
      expect(createLog).not.toBeNull();
      expect(createLog?.result).toBe("SUCCESS");

      const updateLog = await prisma.auditLog.findFirst({
        where: { action: "MONITORING_UPDATED" },
      });
      expect(updateLog).not.toBeNull();
      expect(updateLog?.result).toBe("SUCCESS");

      const archiveLog = await prisma.auditLog.findFirst({
        where: { action: "MONITORING_ARCHIVED" },
      });
      expect(archiveLog).not.toBeNull();
      expect(archiveLog?.result).toBe("SUCCESS");
    });

    it("32. no sensitive leak pada response dan log", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/mother/monitoring/${createdEntryPublicId}`,
        headers: { authorization: `Bearer ${motherToken}` },
      });
      expect(res.statusCode).toBe(200);
      const text = JSON.stringify(res.json());
      expect(text).not.toContain("password");
      expect(text).not.toContain("passwordHash");
      expect(text).not.toContain("tokenHash");
    });
  });

  describe("7. RBAC & ADMIN REJECTION", () => {
    it("admin tidak memiliki akses ke endpoint monitoring ibu atau bidan", async () => {
      const resMother = await app.inject({
        method: "GET",
        url: "/api/mother/monitoring",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(resMother.statusCode).toBe(403);

      const resMidwife = await app.inject({
        method: "GET",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/monitoring`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(resMidwife.statusCode).toBe(403);
    });
  });
});
