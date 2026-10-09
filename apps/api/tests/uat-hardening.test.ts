import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";
import { assertTestDatabaseSafety } from "./setup.js";
import {
  bootstrapTernateFacilities,
  TERNATE_PUSKESMAS_LIST,
} from "../src/scripts/bootstrap-facilities-ternate.js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

describe("UAT Hardening — Data Integrity, Phone UX, Onboarding, Facility CRUD & Ternate Master", () => {
  let app: ReturnType<typeof buildApp>;
  let prisma: PrismaClient;
  let adminToken: string;
  let motherToken: string;
  let consentDocId: string;

  let provinceMalut: { id: string; publicId: string };
  let regencyTernate: { id: string; publicId: string };
  let districtTernateUtara: { id: string; publicId: string };
  let districtTernateSelatan: { id: string; publicId: string };

  const testDbUrl =
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "postgresql://pfram:pfram_dev_only@localhost:5433/pfram_test?schema=public";

  beforeAll(async () => {
    assertTestDatabaseSafety(testDbUrl);

    const env = {
      NODE_ENV: "test",
      DATABASE_URL: testDbUrl,
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

    // Query seeded Admin
    const admin = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628111111111" },
    });
    adminToken = app.jwt.sign({
      sub: admin.id,
      publicId: admin.publicId,
      role: "ADMIN",
    });

    // Query seeded Mother
    const mother = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628133333333" },
    });
    motherToken = app.jwt.sign({
      sub: mother.id,
      publicId: mother.publicId,
      role: "MOTHER",
    });

    // Query regions
    provinceMalut = await prisma.region.findFirstOrThrow({
      where: { code: "82" },
      select: { id: true, publicId: true },
    });
    regencyTernate = await prisma.region.findFirstOrThrow({
      where: { code: "82.71" },
      select: { id: true, publicId: true },
    });
    districtTernateUtara = await prisma.region.findFirstOrThrow({
      where: { code: "82.71.03" },
      select: { id: true, publicId: true },
    });
    districtTernateSelatan = await prisma.region.findFirstOrThrow({
      where: { code: "82.71.02" },
      select: { id: true, publicId: true },
    });

    // Query active consent document
    const consent = await prisma.consentDocument.findFirstOrThrow({
      where: { active: true },
    });
    consentDocId = consent.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
  });

  /* =========================================================================
     1. DATABASE SAFETY & TEST ISOLATION
     ========================================================================= */
  describe("1. Database Safety & Test Isolation", () => {
    it("assertTestDatabaseSafety menolak URL basis data pengembangan (pfram_db)", () => {
      expect(() => {
        assertTestDatabaseSafety("postgresql://pfram:pfram@localhost:5433/pfram_db");
      }).toThrow(/SAFETY GUARD VIOLATION/);
    });

    it("pengujian berjalan di pfram_test dan tidak menarget pfram_db", () => {
      expect(testDbUrl).toContain("pfram_test");
      expect(testDbUrl).not.toContain("pfram_db");
    });
  });

  /* =========================================================================
     2. INDONESIAN PHONE UX & NORMALIZATION
     ========================================================================= */
  describe("2. Indonesian Phone UX & Normalization", () => {
    const testPhone08 = "0853990255171";
    const testPhone62 = "62853990255171";
    const testPhoneFormatted = "+62 853-9902-55171";
    const password = "Password123!";

    // Clean up test user if exists
    beforeAll(async () => {
      await prisma.user.deleteMany({
        where: { phoneNumber: testPhone62 },
      });
    });

    it("pendaftaran dengan awalan 085... dinormalkan ke kanonikal 62... di database", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/register/mother",
        payload: {
          phoneNumber: testPhone08,
          password,
          passwordConfirmation: password,
          fullName: "Ibu Nurul Hidayah",
          consentDocumentIds: [consentDocId],
          clientType: "web",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.user.phoneNumber).toBe(testPhone62);

      // Verify in DB directly
      const saved = await prisma.user.findUnique({
        where: { phoneNumber: testPhone62 },
      });
      expect(saved).not.toBeNull();
      expect(saved?.phoneNumber).toBe(testPhone62);
    });

    it("pendaftaran ulang dengan nomor 62... ditolak sebagai duplikat (PHONE_ALREADY_REGISTERED)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/register/mother",
        payload: {
          phoneNumber: testPhone62,
          password,
          passwordConfirmation: password,
          fullName: "Ibu Nurul Duplikat",
          consentDocumentIds: [consentDocId],
          clientType: "web",
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("PHONE_ALREADY_REGISTERED");
    });

    it("login menerima input nomor 085... dan berhasil masuk ke akun kanonikal 62...", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          phoneNumber: testPhone08,
          password,
          clientType: "web",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.user.phoneNumber).toBe(testPhone62);
    });

    it("login menerima input format +62 853-9902-55171 dan berhasil masuk", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          phoneNumber: testPhoneFormatted,
          password,
          clientType: "web",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.user.phoneNumber).toBe(testPhone62);
    });

    it("menolak nomor handphone terlalu pendek atau huruf dengan pesan edukatif", async () => {
      const resShort = await app.inject({
        method: "POST",
        url: "/api/auth/register/mother",
        payload: {
          phoneNumber: "0812",
          password,
          passwordConfirmation: password,
          fullName: "Ibu Pendek",
          consentDocumentIds: [consentDocId],
          clientType: "web",
        },
      });

      expect(resShort.statusCode).toBe(400);
      const body = JSON.parse(resShort.body);
      expect(body.error.message).toContain("Masukkan nomor handphone Indonesia yang valid");
    });
  });

  /* =========================================================================
     3. MOTHER ONBOARDING LIFECYCLE & PRISMA ERROR SANITIZATION
     ========================================================================= */
  describe("3. Mother Onboarding Lifecycle & Error Leak Safety", () => {
    let onboardToken: string;
    let onboardUserId: string;

    const cleanupMotherUser = async (targetPhone: string) => {
      const oldUser = await prisma.user.findUnique({
        where: { phoneNumber: targetPhone },
        include: { motherProfile: true },
      });
      if (oldUser?.motherProfile) {
        await prisma.pregnancy.deleteMany({
          where: { motherId: oldUser.motherProfile.id },
        });
        await prisma.motherProfile.deleteMany({
          where: { id: oldUser.motherProfile.id },
        });
      }
      await prisma.user.deleteMany({ where: { phoneNumber: targetPhone } });
    };

    beforeAll(async () => {
      // Create a fresh test mother
      const phone = "6289999888877";
      await cleanupMotherUser(phone);

      const reg = await app.inject({
        method: "POST",
        url: "/api/auth/register/mother",
        payload: {
          phoneNumber: phone,
          password: "Password123!",
          passwordConfirmation: "Password123!",
          fullName: "Ibu Onboarding UAT",
          consentDocumentIds: [consentDocId],
          clientType: "web",
        },
      });
      const regBody = JSON.parse(reg.body);
      onboardToken = regBody.data.accessToken;
      const userRecord = await prisma.user.findUniqueOrThrow({
        where: { phoneNumber: phone },
      });
      onboardUserId = userRecord.id;
    });

    afterAll(async () => {
      await cleanupMotherUser("6289999888877");
    });

    it("Langkah 1 & 2: Profil & pemilihan fasilitas berhasil disimpan dengan alamat pendek 'Siko'", async () => {
      // Query valid facility in Ternate Selatan
      const facility = await prisma.healthFacility.findFirstOrThrow({
        where: { districtId: districtTernateSelatan.id, active: true },
      });

      const res = await app.inject({
        method: "PUT",
        url: "/api/mother/profile",
        headers: { authorization: `Bearer ${onboardToken}` },
        payload: {
          fullName: "Ibu Onboarding UAT",
          preferredName: "Ibu Onboard",
          dateOfBirth: "1997-04-12",
          address: "Siko", // Alamat pendek sah
          provincePublicId: provinceMalut.publicId,
          regencyPublicId: regencyTernate.publicId,
          districtPublicId: districtTernateSelatan.publicId,
          primaryFacilityPublicId: facility.publicId,
          familyContactName: "Suami Onboard",
          familyContactPhone: "085311223344",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.profileCompleted).toBe(true);

      const profile = await prisma.motherProfile.findUnique({
        where: { userId: onboardUserId },
      });
      expect(profile?.address).toBe("Siko");
      expect(profile?.profileCompleted).toBe(true);
      expect(profile?.primaryFacilityId).toBe(facility.id);
    });

    it("Langkah 3: Pembuatan kehamilan aktif berhasil menghubungkan kehamilan ke profil ibu", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/mother/pregnancies",
        headers: { authorization: `Bearer ${onboardToken}` },
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

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe("ACTIVE");
      expect(body.data.estimatedDueDate).toBeDefined();

      const pregDb = await prisma.pregnancy.findUnique({
        where: { publicId: body.data.publicId },
      });
      expect(pregDb?.gestationalAgeSource).toBe("LMP");
    });

    it("jika MotherProfile belum ada / hilang, API mengembalikan 404 ramah dan TIDAK membocorkan Prisma error", async () => {
      // Create user without MotherProfile
      const ghostPhone = "6289999000011";
      await prisma.user.deleteMany({ where: { phoneNumber: ghostPhone } });
      const ghostUser = await prisma.user.create({
        data: {
          phoneNumber: ghostPhone,
          passwordHash: "dummyhash",
          role: "MOTHER",
          status: "ACTIVE",
        },
      });
      const ghostToken = app.jwt.sign({
        sub: ghostUser.id,
        publicId: ghostUser.publicId,
        role: "MOTHER",
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/mother/pregnancies",
        headers: { authorization: `Bearer ${ghostToken}` },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("MOTHER_PROFILE_NOT_FOUND");
      expect(body.error.message).toBe(
        "Data profil belum tersedia. Silakan lengkapi kembali data pribadi Anda.",
      );

      // Verify ZERO technical Prisma leaks
      const rawText = JSON.stringify(body);
      expect(rawText).not.toContain("Invalid `app.prisma");
      expect(rawText).not.toContain("PrismaClient");
      expect(rawText).not.toContain("P2025");
      expect(rawText).not.toContain("P2001");
      expect(rawText).not.toContain("No record was found");

      // Cleanup
      await prisma.user.delete({ where: { id: ghostUser.id } });
    });
  });

  /* =========================================================================
     4. HEALTH FACILITY CRUD & DEACTIVATION POLICY
     ========================================================================= */
  describe("4. Health Facility CRUD & Deactivation Policy", () => {
    let createdFacilityPublicId: string;

    it("Admin dapat membuat faskes baru dengan alamat pendek seperti 'Siko'", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/facilities",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Klinik Pratama Siko Sehat",
          type: "CLINIC",
          address: "Siko", // Alamat pendek
          provincePublicId: provinceMalut.publicId,
          regencyPublicId: regencyTernate.publicId,
          districtPublicId: districtTernateUtara.publicId,
          phoneNumber: "085399112233",
          whatsappNumber: "085399112233",
          emergencyPhone: "119",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.name).toBe("Klinik Pratama Siko Sehat");
      expect(body.data.address).toBe("Siko");
      expect(body.data.emergencyPhone).toBe("119");
      createdFacilityPublicId = body.data.publicId;
    });

    it("Admin dapat memperbarui (EDIT) data fasilitas: nama, alamat, telepon, dan jam layanan", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/admin/facilities/${createdFacilityPublicId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Klinik Pratama Siko Sehat (Terkoreksi)",
          address: "Jl. Pemuda No. 45, Siko",
          phoneNumber: "0921-3121999",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.publicId).toBe(createdFacilityPublicId); // Stable ID preserved
      expect(body.data.name).toBe("Klinik Pratama Siko Sehat (Terkoreksi)");
      expect(body.data.address).toBe("Jl. Pemuda No. 45, Siko");
      expect(body.data.phoneNumber).toBe("629213121999");
    });

    it("Admin dapat menonaktifkan fasilitas (deactivate)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/facilities/${createdFacilityPublicId}/deactivate`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.active).toBe(false);

      // Verify excluded from reference list for mothers
      const refList = await app.inject({
        method: "GET",
        url: `/api/reference/facilities?district=${districtTernateUtara.publicId}`,
        headers: { authorization: `Bearer ${motherToken}` },
      });
      const refBody = JSON.parse(refList.body);
      const found = refBody.data.items.some(
        (f: { publicId: string }) => f.publicId === createdFacilityPublicId,
      );
      expect(found).toBe(false);
    });

    it("Admin dapat mengaktifkan kembali fasilitas (reactivate)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/facilities/${createdFacilityPublicId}/activate`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.active).toBe(true);
    });

    it("fasilitas yang memiliki referensi profil ibu DITOLAK untuk dihapus keras (409 FACILITY_REFERENCED)", async () => {
      // Find facility 1 which is referenced by dev mother
      const fac1 = await prisma.healthFacility.findFirstOrThrow({
        where: {
          OR: [
            { masterKey: "TERNATE_PUSKESMAS_KALUMATA" },
            { publicId: "32000000-0000-4000-8000-000000000001" },
            { name: { contains: "Kalumata" } },
          ],
        },
      });

      const res = await app.inject({
        method: "DELETE",
        url: `/api/admin/facilities/${fac1.publicId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("FACILITY_REFERENCED");
      expect(body.error.message).toContain("tidak dapat dihapus karena sudah memiliki riwayat");
    });

    it("fasilitas yang belum pernah direferensikan dapat dihapus secara bersih", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/admin/facilities/${createdFacilityPublicId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.success).toBe(true);

      const check = await prisma.healthFacility.findUnique({
        where: { publicId: createdFacilityPublicId },
      });
      expect(check).toBeNull();
    });
  });

  /* =========================================================================
     5. KOTA TERNATE HEALTH FACILITY MASTER BOOTSTRAP & IDEMPOTENCE
     ========================================================================= */
  describe("5. Kota Ternate Puskesmas Master Bootstrap & Idempotence", () => {
    it("menjalankan bootstrap fasilitas Ternate berhasil mengisi Puskesmas resmi", async () => {
      const result1 = await bootstrapTernateFacilities(prisma);
      expect(result1.total).toBe(11);
      expect(result1.pending).toBe(0);

      // Verify that all 11 puskesmas exist by masterKey
      for (const item of TERNATE_PUSKESMAS_LIST) {
        const found = await prisma.healthFacility.findUnique({
          where: { masterKey: item.masterKey },
        });
        expect(found).not.toBeNull();
        expect(found?.type).toBe("PUSKESMAS");
        expect(found?.masterKey).toBe(item.masterKey);
      }
    });

    it("menjalankan ulang bootstrap bersifat 100% IDEMPOTEN (0 dibuat, semua dilewati)", async () => {
      const result2 = await bootstrapTernateFacilities(prisma);
      expect(result2.total).toBe(11);
      expect(result2.created).toBe(0);
      expect(result2.skipped).toBe(11);
    });

    it("koreksi data oleh Admin TETAP TERJAGA saat bootstrap dijalankan ulang", async () => {
      // Admin corrects address of Puskesmas Sulamadaha
      const targetPuskesmas = await prisma.healthFacility.findUniqueOrThrow({
        where: { masterKey: "TERNATE_PUSKESMAS_SULAMADAHA" },
      });

      const customAddress = "Jl. Batu Angus No. 88, RT 02/01, Sulamadaha Baru (Koreksi Admin)";
      await prisma.healthFacility.update({
        where: { id: targetPuskesmas.id },
        data: { address: customAddress },
      });

      // Rerun bootstrap
      const rerun = await bootstrapTernateFacilities(prisma);
      expect(rerun.skipped).toBeGreaterThanOrEqual(1);

      // Verify custom address is STILL there and was NOT overwritten!
      const afterBootstrap = await prisma.healthFacility.findUniqueOrThrow({
        where: { id: targetPuskesmas.id },
      });
      expect(afterBootstrap.address).toBe(customAddress);
    });
  });

  /* =========================================================================
     6. MASTER KEY STABLE IDENTITY & IMMUTABLE LOOKUP HARDENING
     ========================================================================= */
  describe("6. Master Key Stable Identity & Immutable Lookup Hardening", () => {
    it("Admin mengubah NAMA fasilitas (Puskesmas Sulamadaha -> BLUD Puskesmas Sulamadaha) TIDAK menyebabkan duplikasi saat bootstrap diulang", async () => {
      // 1. Fetch initial Sulamadaha facility
      const initial = await prisma.healthFacility.findUniqueOrThrow({
        where: { masterKey: "TERNATE_PUSKESMAS_SULAMADAHA" },
      });
      const initialId = initial.id;
      const initialPublicId = initial.publicId;

      // 2. Admin edits name and address via API PATCH
      const resPatch = await app.inject({
        method: "PATCH",
        url: `/api/admin/facilities/${initialPublicId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "BLUD Puskesmas Sulamadaha",
          address: "Jl. Santiong Baru No. 10, Sulamadaha Barat",
        },
      });
      expect(resPatch.statusCode).toBe(200);
      const patchBody = JSON.parse(resPatch.body);
      expect(patchBody.data.name).toBe("BLUD Puskesmas Sulamadaha");
      expect(patchBody.data.address).toBe("Jl. Santiong Baru No. 10, Sulamadaha Barat");
      expect(patchBody.data.publicId).toBe(initialPublicId);

      // 3. Re-run bootstrap
      const rerun = await bootstrapTernateFacilities(prisma);
      expect(rerun.created).toBe(0); // MUST NOT CREATE A DUPLICATE
      expect(rerun.skipped).toBe(11);

      // 4. Verify facility in database
      // Total facilities with masterKey TERNATE_PUSKESMAS_SULAMADAHA must be exactly 1
      const countSulamadahaKey = await prisma.healthFacility.count({
        where: { masterKey: "TERNATE_PUSKESMAS_SULAMADAHA" },
      });
      expect(countSulamadahaKey).toBe(1);

      // Verify the renamed facility still has the Admin's edited name and address
      const afterRerun = await prisma.healthFacility.findUniqueOrThrow({
        where: { masterKey: "TERNATE_PUSKESMAS_SULAMADAHA" },
      });
      expect(afterRerun.id).toBe(initialId);
      expect(afterRerun.publicId).toBe(initialPublicId);
      expect(afterRerun.name).toBe("BLUD Puskesmas Sulamadaha");
      expect(afterRerun.address).toBe("Jl. Santiong Baru No. 10, Sulamadaha Barat");

      // Verify NO separate facility with original name was created
      const duplicateOriginal = await prisma.healthFacility.findMany({
        where: { name: "Puskesmas Sulamadaha" },
      });
      expect(duplicateOriginal.length).toBe(0);

      // Clean up rename to keep test suite re-runnable
      await prisma.healthFacility.update({
        where: { id: initialId },
        data: { name: "Puskesmas Sulamadaha" },
      });
    });

    it("Admin mengubah nomor telepon, whatsapp, dan jam layanan tidak ditimpa oleh bootstrap", async () => {
      const jambula = await prisma.healthFacility.findUniqueOrThrow({
        where: { masterKey: "TERNATE_PUSKESMAS_JAMBULA" },
      });

      // Admin updates phone, whatsapp, openingHours
      await prisma.healthFacility.update({
        where: { id: jambula.id },
        data: {
          phoneNumber: "6285399887766",
          whatsappNumber: "6285399887766",
          serviceInformation: "Puskesmas Pelayanan Ramah Ibu dan Anak 24 Jam",
        },
      });

      // Rerun bootstrap
      await bootstrapTernateFacilities(prisma);

      const after = await prisma.healthFacility.findUniqueOrThrow({
        where: { masterKey: "TERNATE_PUSKESMAS_JAMBULA" },
      });
      expect(after.phoneNumber).toBe("6285399887766");
      expect(after.whatsappNumber).toBe("6285399887766");
      expect(after.serviceInformation).toBe("Puskesmas Pelayanan Ramah Ibu dan Anak 24 Jam");
    });

    it("Admin menonaktifkan fasilitas ber-masterKey TIDAK diaktifkan kembali secara otomatis oleh bootstrap", async () => {
      const gambesi = await prisma.healthFacility.findUniqueOrThrow({
        where: { masterKey: "TERNATE_PUSKESMAS_GAMBESI" },
      });

      // Admin deactivates facility
      const resDeact = await app.inject({
        method: "POST",
        url: `/api/admin/facilities/${gambesi.publicId}/deactivate`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(resDeact.statusCode).toBe(200);

      const checkDeact = await prisma.healthFacility.findUniqueOrThrow({
        where: { id: gambesi.id },
      });
      expect(checkDeact.active).toBe(false);

      // Rerun bootstrap
      await bootstrapTernateFacilities(prisma);

      // Facility MUST REMAIN INACTIVE! Bootstrap must NOT reactivate it.
      const afterRerun = await prisma.healthFacility.findUniqueOrThrow({
        where: { id: gambesi.id },
      });
      expect(afterRerun.active).toBe(false);

      // Clean up: reactivate for subsequent suites
      await prisma.healthFacility.update({
        where: { id: gambesi.id },
        data: { active: true },
      });
    });

    it("referensi MotherProfile ke fasilitas ber-masterKey tetap utuh saat fasilitas diedit dan bootstrap diulang", async () => {
      const kalumata = await prisma.healthFacility.findUniqueOrThrow({
        where: { masterKey: "TERNATE_PUSKESMAS_KALUMATA" },
      });

      // Find dev mother referencing kalumata
      const motherProfile = await prisma.motherProfile.findFirstOrThrow({
        where: { primaryFacilityId: kalumata.id },
      });

      // Admin renames Kalumata
      await prisma.healthFacility.update({
        where: { id: kalumata.id },
        data: {
          name: "UPTD Puskesmas Kalumata Sehat",
          address: "Jl. Pertamina Baru No. 99, Kalumata",
        },
      });

      // Rerun bootstrap
      await bootstrapTernateFacilities(prisma);

      // Verify mother still points to the exact same facility ID
      const motherAfter = await prisma.motherProfile.findUniqueOrThrow({
        where: { id: motherProfile.id },
      });
      expect(motherAfter.primaryFacilityId).toBe(kalumata.id);

      const facAfter = await prisma.healthFacility.findUniqueOrThrow({
        where: { id: kalumata.id },
      });
      expect(facAfter.name).toBe("UPTD Puskesmas Kalumata Sehat");
      expect(facAfter.masterKey).toBe("TERNATE_PUSKESMAS_KALUMATA");

      // Clean up rename to keep test suite re-runnable
      await prisma.healthFacility.update({
        where: { id: kalumata.id },
        data: { name: "Puskesmas Kalumata" },
      });
    });

    it("fasilitas manual buatan Admin (masterKey = null) sama sekali tidak tersentuh oleh bootstrap", async () => {
      // 1. Create a manual private facility with masterKey null
      const manualFacility = await prisma.healthFacility.create({
        data: {
          masterKey: null,
          name: "Klinik Swasta UAT Mandiri Ternate",
          type: "CLINIC",
          address: "Jl. Ahmad Yani No. 12, Ternate Utara",
          provinceId: provinceMalut.id,
          regencyId: regencyTernate.id,
          districtId: districtTernateUtara.id,
          active: true,
        },
      });

      // 2. Rerun bootstrap
      await bootstrapTernateFacilities(prisma);

      // 3. Verify manual facility is completely untouched
      const checkManual = await prisma.healthFacility.findUniqueOrThrow({
        where: { id: manualFacility.id },
      });
      expect(checkManual.masterKey).toBeNull();
      expect(checkManual.name).toBe("Klinik Swasta UAT Mandiri Ternate");
      expect(checkManual.active).toBe(true);

      // Clean up
      await prisma.healthFacility.delete({ where: { id: manualFacility.id } });
    });
  });
});
