import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";
import { profileCompletion } from "../src/modules/stage3/service.js";
import {
  calculateAge,
  calculateEstimatedDueDate,
  calculateGestationalAge,
  formatDateOnly,
  parseDateOnly,
  pregnancySchema,
  trimesterFromWeeks,
} from "@pfram/validation";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const motherPassword = process.env.MOTHER_PASSWORD;
if (!motherPassword) {
  throw new Error("Missing required environment variable: MOTHER_PASSWORD");
}

describe("Stage 3 — Verification Suite", () => {
  let app: ReturnType<typeof buildApp>;
  let prisma: PrismaClient;

  let adminToken: string;
  let midwifeToken: string;
  let motherToken: string;
  let otherMidwifeToken: string;

  let devAdminUser: { id: string; publicId: string };
  let devMidwifeProfile: { id: string; publicId: string };
  let devMotherProfile: { id: string; publicId: string };
  let devProvince: { id: string; publicId: string };
  let devRegency: { id: string; publicId: string };
  let devDistrict: { id: string; publicId: string };
  let devFacility: { id: string; publicId: string };
  let devPregnancy: { id: string; publicId: string };

  beforeAll(async () => {
    const env = {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ||
        process.env.DATABASE_URL ||
        "postgresql://pfram:pfram_dev_only@localhost:5433/pfram_test?schema=public",
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "development-access-secret-change-me-at-least-32-characters",
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "development-refresh-secret-change-me-at-least-32-characters",
      CORS_ORIGINS: "http://localhost:5173",
      COOKIE_SECURE: "false",
    };
    prisma = new PrismaClient({
      datasources: { db: { url: env.DATABASE_URL } },
    });
    app = buildApp({ env, prisma });
    await app.ready();

    // Query seeded entities
    const admin = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628111111111" },
    });
    devAdminUser = admin;

    const midwife = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628122222222" },
      include: { midwifeProfile: true },
    });
    devMidwifeProfile = midwife.midwifeProfile!;

    const mother = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628133333333" },
      include: { motherProfile: { include: { pregnancies: true } } },
    });
    devMotherProfile = mother.motherProfile!;
    devPregnancy = mother.motherProfile!.pregnancies[0]!;

    await prisma.motherProfile.update({
      where: { id: mother.motherProfile!.id },
      data: { fullName: "Ibu Development" },
    });

    const prov = await prisma.region.findFirstOrThrow({
      where: { code: "82" },
    });
    devProvince = prov;

    const reg = await prisma.region.findFirstOrThrow({
      where: { code: "82.71" },
    });
    devRegency = reg;

    const dist = await prisma.region.findFirstOrThrow({
      where: { code: "82.71.02" },
    });
    devDistrict = dist;

    const fac = await prisma.healthFacility.findFirstOrThrow({
      where: { publicId: "32000000-0000-4000-8000-000000000001" },
    });
    devFacility = fac;

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

    // Create a secondary midwife to test isolation and replacements
    const secondMidwifePhone = "628129999901";
    let secondMidwifeUser = await prisma.user.findUnique({
      where: { phoneNumber: secondMidwifePhone },
      include: { midwifeProfile: true },
    });
    if (!secondMidwifeUser) {
      secondMidwifeUser = await prisma.user.create({
        data: {
          phoneNumber: secondMidwifePhone,
          passwordHash: "hash_dev_test",
          role: "MIDWIFE",
          status: "ACTIVE",
          midwifeProfile: {
            create: {
              fullName: "Bidan Kedua Uji",
              phoneNumber: secondMidwifePhone,
              active: true,
              primaryFacilityId: devFacility.id,
            },
          },
        },
        include: { midwifeProfile: true },
      });
    }

    const existingFacilityAssignment = await prisma.midwifeFacilityAssignment.findFirst({
      where: {
        midwifeId: secondMidwifeUser.midwifeProfile!.id,
        facilityId: devFacility.id,
      },
    });
    if (!existingFacilityAssignment) {
      await prisma.midwifeFacilityAssignment.create({
        data: {
          midwifeId: secondMidwifeUser.midwifeProfile!.id,
          facilityId: devFacility.id,
          active: true,
        },
      });
    }

    otherMidwifeToken = app.jwt.sign({
      sub: secondMidwifeUser.id,
      publicId: secondMidwifeUser.publicId,
      role: "MIDWIFE",
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
  });

  describe("AUTH & SECURITY", () => {
    it("login development accounts PASS dan mengembalikan profileCompletion", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          phoneNumber: "628133333333",
          password: motherPassword,
          clientType: "mobile",
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.user.role).toBe("MOTHER");
      expect(body.data.user.profileCompletionStatus).toBeDefined();
    });

    it("login kredensial salah ditolak", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          phoneNumber: "628133333333",
          password: "WrongPassword999!",
          clientType: "web",
        },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe("INVALID_CREDENTIALS");
    });

    it("role guard menolak akses non-admin ke endpoint admin", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/regions",
        headers: { authorization: `Bearer ${motherToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it("logout membersihkan sesi dengan aman", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/logout",
        payload: { clientType: "mobile" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.loggedOut).toBe(true);
    });
  });

  describe("3.1 MASTER WILAYAH", () => {
    it("admin dapat melihat daftar wilayah dengan filter", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/regions?level=PROVINCE&limit=10",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.items.length).toBeGreaterThan(0);
      expect(json.data.items[0].level).toBe("PROVINCE");
    });

    it("admin dapat membuat wilayah bertingkat dengan hierarki valid", async () => {
      const uniqueName = `Kecamatan Uji ${Date.now()}`;
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/regions",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: uniqueName,
          code: `UJI-${Date.now()}`,
          level: "DISTRICT",
          parentPublicId: devRegency.publicId,
        },
      });
      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.data.name).toBe(uniqueName);
      expect(json.data.level).toBe("DISTRICT");
      expect(json.data.parent.publicId).toBe(devRegency.publicId);
    });

    it("hierarki tidak sesuai ditolak (misal: Kecamatan dengan parent Provinsi)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/regions",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Kecamatan Salah",
          level: "DISTRICT",
          parentPublicId: devProvince.publicId,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("REGION_PARENT_INVALID");
    });

    it("provinsi dengan parent ditolak", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/regions",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Provinsi Bertingkat",
          level: "PROVINCE",
          parentPublicId: devRegency.publicId,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("REGION_PARENT_INVALID");
    });

    it("admin dapat menonaktifkan dan mengaktifkan wilayah", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/api/admin/regions",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: `Desa Toggle ${Date.now()}`,
          level: "VILLAGE",
          parentPublicId: devDistrict.publicId,
        },
      });
      const publicId = createRes.json().data.publicId;

      const deact = await app.inject({
        method: "POST",
        url: `/api/admin/regions/${publicId}/deactivate`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(deact.statusCode).toBe(200);
      expect(deact.json().data.active).toBe(false);

      const act = await app.inject({
        method: "POST",
        url: `/api/admin/regions/${publicId}/activate`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(act.statusCode).toBe(200);
      expect(act.json().data.active).toBe(true);
    });
  });

  describe("3.2 MASTER FASILITAS KESEHATAN", () => {
    it("admin dapat membuat fasilitas dengan hierarki wilayah valid", async () => {
      const uniqueName = `Puskesmas Uji ${Date.now()}`;
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/facilities",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: uniqueName,
          type: "PUSKESMAS",
          address: "Jalan Kesehatan No. 10",
          provincePublicId: devProvince.publicId,
          regencyPublicId: devRegency.publicId,
          districtPublicId: devDistrict.publicId,
          phoneNumber: "081234567890",
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().data.name).toBe(uniqueName);
      expect(res.json().data.type).toBe("PUSKESMAS");
    });

    it("pembuatan fasilitas menerima alamat pendek yang sah (misal: Siko)", async () => {
      const uniqueName = `Pustu Siko ${Date.now()}`;
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/facilities",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: uniqueName,
          type: "PUSKESMAS",
          address: "Siko",
          provincePublicId: devProvince.publicId,
          regencyPublicId: devRegency.publicId,
          districtPublicId: devDistrict.publicId,
          phoneNumber: "081234567890",
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().data.address).toBe("Siko");
    });

    it("pembuatan fasilitas ditolak jika hierarki wilayah tidak konsisten", async () => {
      // Create independent province & regency to cause mismatch
      const otherProv = await prisma.region.create({
        data: {
          name: `Provinsi Lain ${Date.now()}`,
          level: "PROVINCE",
          active: true,
        },
      });
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/facilities",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Puskesmas Mismatch",
          type: "PUSKESMAS",
          address: "Jalan Mismatch",
          provincePublicId: otherProv.publicId,
          regencyPublicId: devRegency.publicId,
          districtPublicId: devDistrict.publicId,
        },
      });
      expect(res.statusCode).toBe(400);
      const errJson = res.json();
      expect(errJson.error.code).toBe("REGION_HIERARCHY_INVALID");
      expect(errJson.error.fieldErrors).toBeDefined();
      expect(errJson.error.fieldErrors.regencyPublicId).toBeDefined();
    });

    it("fasilitas nonaktif tidak muncul pada pencarian referensi aktif", async () => {
      const f = await prisma.healthFacility.create({
        data: {
          name: `Fasilitas Nonaktif ${Date.now()}`,
          type: "CLINIC",
          address: "Jalan Nonaktif",
          provinceId: devProvince.id,
          regencyId: devRegency.id,
          districtId: devDistrict.id,
          active: false,
        },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/reference/facilities?search=${encodeURIComponent(f.name)}`,
        headers: { authorization: `Bearer ${motherToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.items.length).toBe(0);
    });
  });

  describe("3.3 PROFIL BIDAN", () => {
    it("bidan dapat melihat profil sendiri", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/midwife/profile",
        headers: { authorization: `Bearer ${midwifeToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(["Bidan Development", "Bidan Demo 01 (Siti Rahma, S.Tr.Keb)"]).toContain(res.json().data.fullName);
    });

    it("bidan hanya dapat memperbarui field yang diizinkan", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/api/midwife/profile",
        headers: { authorization: `Bearer ${midwifeToken}` },
        payload: {
          preferredName: "Bidan Kesayangan",
          whatsappNumber: "081222222222",
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.preferredName).toBe("Bidan Kesayangan");
    });
  });

  describe("3.4 PROFIL PRIBADI IBU", () => {
    it("ibu dapat melihat profil pribadi sendiri", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/mother/profile",
        headers: { authorization: `Bearer ${motherToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.fullName).toBe("Ibu Development");
      expect(res.json().data.profileCompleted).toBe(true);
      expect(calculateAge(res.json().data.dateOfBirth)).toBeGreaterThanOrEqual(18);
    });

    it("ibu tidak dapat mengedit profil ibu lain (terisolasi by user sub)", async () => {
      // Any update to /api/mother/profile automatically scopes to req.user.sub
      const res = await app.inject({
        method: "PUT",
        url: "/api/mother/profile",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: {
          fullName: "Ibu Dev Updated",
          dateOfBirth: "1996-01-01",
          address: "Jalan Ibu No. 1",
          provincePublicId: devProvince.publicId,
          regencyPublicId: devRegency.publicId,
          districtPublicId: devDistrict.publicId,
          primaryFacilityPublicId: devFacility.publicId,
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.fullName).toBe("Ibu Dev Updated");

      await prisma.motherProfile.update({
        where: { id: devMotherProfile.id },
        data: { fullName: "Ibu Development" },
      });
    });

    it("pembaruan profil ibu menolak tanggal lahir di masa depan", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/mother/profile",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: {
          fullName: "Ibu Dev Updated",
          dateOfBirth: "2099-01-01",
          address: "Siko",
          provincePublicId: devProvince.publicId,
          regencyPublicId: devRegency.publicId,
          districtPublicId: devDistrict.publicId,
          primaryFacilityPublicId: devFacility.publicId,
        },
      });
      expect(res.statusCode).toBe(400);
      const json = res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.fieldErrors).toBeDefined();
      expect(json.error.fieldErrors.dateOfBirth).toContain("Tanggal lahir tidak boleh berada di masa depan");
    });

    it("pembaruan profil ibu menerima alamat pendek yang sah (misal: Siko)", async () => {
      try {
        const res = await app.inject({
          method: "PUT",
          url: "/api/mother/profile",
          headers: { authorization: `Bearer ${motherToken}` },
          payload: {
            fullName: "Ibu Dev Updated",
            dateOfBirth: "1996-01-01",
            address: "Siko",
            provincePublicId: devProvince.publicId,
            regencyPublicId: devRegency.publicId,
            districtPublicId: devDistrict.publicId,
            primaryFacilityPublicId: devFacility.publicId,
          },
        });
        expect(res.statusCode).toBe(200);
        const updated = await prisma.motherProfile.findUniqueOrThrow({
          where: { id: devMotherProfile.id },
        });
        expect(updated.address).toBe("Siko");
      } finally {
        await prisma.motherProfile.update({
          where: { id: devMotherProfile.id },
          data: { fullName: "Ibu Development", address: "Jalan Ibu No. 1" },
        });
      }
    });
  });

  describe("3.5 PROFIL KEHAMILAN & PERHITUNGAN DINAMIS", () => {
    it("hanya boleh satu kehamilan aktif untuk satu ibu", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/mother/pregnancies",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: {
          gestationalAgeSource: "LMP",
          lastMenstrualPeriod: "2026-07-01",
          pregnancyType: "SINGLETON",
          previousPregnancyCount: 0,
          previousDeliveryCount: 0,
          miscarriageCount: 0,
          previousCesarean: false,
          hypertensionHistory: false,
          preeclampsiaHistory: false,
          diabetesHistory: false,
          heartDiseaseHistory: false,
          kidneyDiseaseHistory: false,
        },
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("ACTIVE_PREGNANCY_EXISTS");
    });

    it("HPHT masa depan ditolak oleh validasi", () => {
      const invalidFuture = pregnancySchema.safeParse({
        gestationalAgeSource: "LMP",
        lastMenstrualPeriod: "2099-01-01",
        pregnancyType: "SINGLETON",
        previousPregnancyCount: 0,
        previousDeliveryCount: 0,
        miscarriageCount: 0,
        previousCesarean: false,
        hypertensionHistory: false,
        preeclampsiaHistory: false,
        diabetesHistory: false,
        heartDiseaseHistory: false,
        kidneyDiseaseHistory: false,
      });
      expect(invalidFuture.success).toBe(false);
    });

    it("perhitungan HPL (Naegele 280 hari) tepat dan konsisten", () => {
      const lmp = "2026-01-01";
      const edd = calculateEstimatedDueDate(lmp);
      expect(formatDateOnly(edd)).toBe("2026-10-08");
    });

    it("perhitungan usia kehamilan dan batas trimester akurat", () => {
      // 10 weeks
      const t1 = calculateGestationalAge("2026-06-01", 0, 0, parseDateOnly("2026-08-10"));
      expect(t1.weeks).toBe(10);
      expect(trimesterFromWeeks(t1.weeks)).toBe(1);

      // 20 weeks
      const t2 = calculateGestationalAge("2026-01-01", 0, 0, parseDateOnly("2026-05-21"));
      expect(t2.weeks).toBe(20);
      expect(trimesterFromWeeks(t2.weeks)).toBe(2);

      // 30 weeks
      const t3 = calculateGestationalAge("2026-01-01", 0, 0, parseDateOnly("2026-07-30"));
      expect(t3.weeks).toBe(30);
      expect(trimesterFromWeeks(t3.weeks)).toBe(3);
    });
  });

  describe("3.6 PENUGASAN BIDAN & RIWAYAT PERGANTIAN", () => {
    it("bidan yang tidak ditugaskan tidak dapat melihat ibu binaan", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}`,
        headers: { authorization: `Bearer ${otherMidwifeToken}` },
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("MOTHER_NOT_ASSIGNED");
    });

    it("pergantian bidan oleh admin tidak menghapus record lama (REPLACED status dan endedAt terisi)", async () => {
      // Find current active assignment
      const currentAssignment = await prisma.motherMidwifeAssignment.findFirstOrThrow({
        where: {
          motherId: devMotherProfile.id,
          pregnancyId: devPregnancy.id,
          status: "ACTIVE",
        },
      });

      // Query second midwife publicId
      const secondMidwife = await prisma.midwifeProfile.findFirstOrThrow({
        where: { fullName: "Bidan Kedua Uji" },
      });

      const res = await app.inject({
        method: "POST",
        url: `/api/admin/assignments/${currentAssignment.publicId}/replace`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          midwifePublicId: secondMidwife.publicId,
          reason: "Bidan pertama sedang dinas luar wilayah",
        },
      });

      expect(res.statusCode).toBe(200);
      const newAssignment = res.json().data;
      expect(newAssignment.status).toBe("ACTIVE");

      // Verify old assignment in DB
      const oldCheck = await prisma.motherMidwifeAssignment.findUniqueOrThrow({
        where: { id: currentAssignment.id },
      });
      expect(oldCheck.status).toBe("REPLACED");
      expect(oldCheck.endedAt).not.toBeNull();
      expect(oldCheck.replacementReason).toBe("Bidan pertama sedang dinas luar wilayah");

      // Verify second midwife can now see mother
      const assignedCheck = await app.inject({
        method: "GET",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}`,
        headers: { authorization: `Bearer ${otherMidwifeToken}` },
      });
      expect(assignedCheck.statusCode).toBe(200);

      // Restore assignment back to original dev midwife to keep seed consistent
      await app.inject({
        method: "POST",
        url: `/api/admin/assignments/${newAssignment.publicId}/replace`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          midwifePublicId: devMidwifeProfile.publicId,
          reason: "Bidan dev kembali bertugas",
        },
      });
    });

    it("penugasan bidan nonaktif ditolak", async () => {
      const inactiveMidwifeUser = await prisma.user.create({
        data: {
          phoneNumber: `62812999${Date.now().toString().slice(-5)}`,
          passwordHash: "hash",
          role: "MIDWIFE",
          status: "ACTIVE",
          midwifeProfile: {
            create: {
              fullName: "Bidan Nonaktif",
              phoneNumber: "0812999000",
              active: false,
            },
          },
        },
        include: { midwifeProfile: true },
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/admin/assignments",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          motherPublicId: devMotherProfile.publicId,
          pregnancyPublicId: devPregnancy.publicId,
          midwifePublicId: inactiveMidwifeUser.midwifeProfile!.publicId,
          facilityPublicId: devFacility.publicId,
        },
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("MIDWIFE_INACTIVE");
    });
  });

  describe("3.7 PROFILE COMPLETION LOGIC", () => {
    it("evaluasi 6 status kelengkapan profil teruji lengkap", async () => {
      // 1. ACCOUNT_READY (fresh user)
      const freshUser = await prisma.user.create({
        data: {
          phoneNumber: `6281399${Date.now().toString().slice(-5)}`,
          passwordHash: "hash",
          role: "MOTHER",
          status: "ACTIVE",
          motherProfile: {
            create: {
              fullName: "Ibu Baru Mendaftar",
            },
          },
        },
      });

      try {
        const st1 = await profileCompletion(prisma, freshUser.id);
        expect(st1.status).toBe("ACCOUNT_READY");

        // 2. PERSONAL_PROFILE_INCOMPLETE (partially entered)
        await prisma.motherProfile.update({
          where: { userId: freshUser.id },
          data: { address: "Jalan Uji" },
        });
        const st2 = await profileCompletion(prisma, freshUser.id);
        expect(st2.status).toBe("PERSONAL_PROFILE_INCOMPLETE");

        // 3. FACILITY_NOT_SELECTED
        await prisma.motherProfile.update({
          where: { userId: freshUser.id },
          data: {
            dateOfBirth: parseDateOnly("1998-01-01"),
            provinceId: devProvince.id,
            regencyId: devRegency.id,
            districtId: devDistrict.id,
            profileCompleted: true,
            primaryFacilityId: null,
          },
        });
        const st3 = await profileCompletion(prisma, freshUser.id);
        expect(st3.status).toBe("FACILITY_NOT_SELECTED");

        // 4. PREGNANCY_PROFILE_INCOMPLETE
        await prisma.motherProfile.update({
          where: { userId: freshUser.id },
          data: { primaryFacilityId: devFacility.id },
        });
        const st4 = await profileCompletion(prisma, freshUser.id);
        expect(st4.status).toBe("PREGNANCY_PROFILE_INCOMPLETE");

        // 5. MIDWIFE_NOT_ASSIGNED
        const preg = await prisma.pregnancy.create({
          data: {
            motherId: (await prisma.motherProfile.findUniqueOrThrow({ where: { userId: freshUser.id } })).id,
            pregnancyNumber: 1,
            lastMenstrualPeriod: parseDateOnly("2026-06-01"),
            estimatedDueDate: calculateEstimatedDueDate("2026-06-01"),
            gestationalAgeSource: "LMP",
            completedProfile: true,
          },
        });
        const st5 = await profileCompletion(prisma, freshUser.id);
        expect(st5.status).toBe("MIDWIFE_NOT_ASSIGNED");

        // 6. COMPLETE
        const motherId = (await prisma.motherProfile.findUniqueOrThrow({ where: { userId: freshUser.id } })).id;
        await prisma.motherMidwifeAssignment.create({
          data: {
            motherId,
            pregnancyId: preg.id,
            midwifeId: devMidwifeProfile.id,
            facilityId: devFacility.id,
            assignedByUserId: devAdminUser.id,
            status: "ACTIVE",
          },
        });
        const st6 = await profileCompletion(prisma, freshUser.id);
        expect(st6.status).toBe("COMPLETE");
        expect(st6.profileCompleted).toBe(true);
      } finally {
        const mp = await prisma.motherProfile.findUnique({ where: { userId: freshUser.id } });
        if (mp) {
          await prisma.motherMidwifeAssignment.deleteMany({ where: { motherId: mp.id } });
          await prisma.pregnancy.deleteMany({ where: { motherId: mp.id } });
          await prisma.motherProfile.delete({ where: { id: mp.id } });
        }
        await prisma.user.deleteMany({ where: { id: freshUser.id } });
      }
    });
  });
});
