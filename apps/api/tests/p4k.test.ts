import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

describe("Stage 8 — P4K Digital & Rencana Rujukan Kepulauan Suite", () => {
  let app: ReturnType<typeof buildApp>;
  let prisma: PrismaClient;

  let motherToken: string;
  let assignedMidwifeToken: string;
  let unassignedMidwifeToken: string;

  let devMotherProfile: { id: string; publicId: string };

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

    // 1. Assigned Midwife (628122222222)
    const midwife = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628122222222" },
      include: { midwifeProfile: true },
    });
    assignedMidwifeToken = app.jwt.sign({
      sub: midwife.id,
      publicId: midwife.publicId,
      role: "MIDWIFE",
    });

    // 2. Mother (628133333333)
    const mother = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628133333333" },
      include: { motherProfile: { include: { pregnancies: true } } },
    });
    devMotherProfile = mother.motherProfile!;
    motherToken = app.jwt.sign({
      sub: mother.id,
      publicId: mother.publicId,
      role: "MOTHER",
    });

    // 3. Facility
    await prisma.healthFacility.findFirstOrThrow({
      where: { publicId: "32000000-0000-4000-8000-000000000001" },
    });

    // 4. Unassigned midwife
    const unassignedPhone = "6281299990002";
    let unassignedUser = await prisma.user.findUnique({
      where: { phoneNumber: unassignedPhone },
      include: { midwifeProfile: true },
    });
    if (!unassignedUser) {
      unassignedUser = await prisma.user.create({
        data: {
          phoneNumber: unassignedPhone,
          passwordHash: "hash_test_unassigned",
          role: "MIDWIFE",
          status: "ACTIVE",
          midwifeProfile: {
            create: {
              fullName: "Bidan Tidak Ditugaskan",
              phoneNumber: unassignedPhone,
              active: true,
            },
          },
        },
        include: { midwifeProfile: true },
      });
    }
    unassignedMidwifeToken = app.jwt.sign({
      sub: unassignedUser.id,
      publicId: unassignedUser.publicId,
      role: "MIDWIFE",
    });

    // Reset P4K and Referral Plan for test mother to ensure clean test state
    await prisma.p4kPlan.deleteMany({
      where: { motherId: devMotherProfile.id },
    });
    await prisma.referralPlan.deleteMany({
      where: { motherId: devMotherProfile.id },
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe("1. P4K Digital — Mother Access", () => {
    it("GET /api/mother/p4k menghasilkan data P4K default prefill dan 9 item checklist", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/mother/p4k",
        headers: { authorization: `Bearer ${motherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.motherPublicId).toBe(devMotherProfile.publicId);
      expect(body.data.deliveryAttendant).toBe("BIDAN");
      expect(body.data.checklistItems).toHaveLength(9);
      expect(body.data.checklistProgress).toBeDefined();
      expect(body.data.checklistProgress.total).toBe(9);
      expect(body.data.checklistProgress.checked).toBe(0);
      expect(body.data.checklistProgress.percentage).toBe(0);
    });

    it("PUT /api/mother/p4k memperbarui perencanaan persalinan", async () => {
      const payload = {
        deliveryAttendant: "DOKTER_SPESIALIS",
        birthCompanionName: "Ahmad Santoso (Suami)",
        birthCompanionPhone: "081234567890",
        transportation: "SPEEDBOAT",
        fundingSource: "BPJS",
        bpjsNumber: "0001234567890",
        bloodDonors: [
          { name: "Doni Pratama", bloodType: "O+", phone: "081299991111" },
        ],
        emergencyContactName: "Ibu Nurul (Ibu Kandung)",
        emergencyContactPhone: "081299992222",
        preparationNotes: "Jadwal kapal jam 08:00 pagi setiap hari Selasa dan Kamis",
      };

      const res = await app.inject({
        method: "PUT",
        url: "/api/mother/p4k",
        headers: { authorization: `Bearer ${motherToken}` },
        payload,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.deliveryAttendant).toBe("DOKTER_SPESIALIS");
      expect(body.data.transportation).toBe("SPEEDBOAT");
      expect(body.data.bloodDonors).toHaveLength(1);
      expect(body.data.bloodDonors[0].name).toBe("Doni Pratama");
      expect(body.data.preparationNotes).toContain("Jadwal kapal");
    });
  });

  describe("2. Checklist Persiapan Persalinan", () => {
    it("GET /api/mother/p4k/checklist mengembalikan item dan status progres", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/mother/p4k/checklist",
        headers: { authorization: `Bearer ${motherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.items).toHaveLength(9);
      expect(body.data.progress.total).toBe(9);
    });

    it("PATCH /api/mother/p4k/checklist dapat mencentang item dan mengkalkulasi progres", async () => {
      const patchPayload = {
        items: [
          { itemKey: "BPJS_CARD", checked: true },
          { itemKey: "KIA_BOOK", checked: true },
          { itemKey: "MOTHER_CLOTHES", checked: true },
        ],
      };

      const res = await app.inject({
        method: "PATCH",
        url: "/api/mother/p4k/checklist",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: patchPayload,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.progress.checked).toBe(3);
      expect(body.data.progress.percentage).toBe(33);

      const bpjsItem = body.data.items.find((i: { itemKey: string }) => i.itemKey === "BPJS_CARD");
      expect(bpjsItem.checked).toBe(true);
      expect(bpjsItem.checkedAt).not.toBeNull();
    });

    it("PATCH /api/mother/p4k/checklist dapat membatalkan centang (uncheck)", async () => {
      const patchPayload = {
        items: [
          { itemKey: "MOTHER_CLOTHES", checked: false },
        ],
      };

      const res = await app.inject({
        method: "PATCH",
        url: "/api/mother/p4k/checklist",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: patchPayload,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.progress.checked).toBe(2);
      expect(body.data.progress.percentage).toBe(22);
    });
  });

  describe("3. Rencana Rujukan Kepulauan — Mother Access", () => {
    it("GET /api/mother/referral-plan menghasilkan rencana rujukan default", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/mother/referral-plan",
        headers: { authorization: `Bearer ${motherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.transportType).toBe("AMBULANCE");
    });

    it("PUT /api/mother/referral-plan memperbarui detail rujukan kepulauan", async () => {
      const payload = {
        transportType: "SPEEDBOAT",
        transportOperatorName: "Pak Mansyur",
        transportContactNumber: "081234445555",
        estimatedTravelTimeMinutes: 75,
        manualDepartureSchedule: "Berangkat pagi 06:30 atau standby panggilan darurat",
        departurePoint: "Dermaga Pulau Sebatik",
        companions: "Suami & Bidan Desa Siti",
        rtkName: "Rumah Tunggu Kelahiran Sehati Nunukan",
        rtkAddress: "Jl. Mulawarman No. 5, Nunukan Timur",
        rtkPhone: "081388889999",
        alternativeNotes: "Jika gelombang tinggi di atas 2 meter, beralih ke kapal Pelni atau koordinasi Basarnas",
      };

      const res = await app.inject({
        method: "PUT",
        url: "/api/mother/referral-plan",
        headers: { authorization: `Bearer ${motherToken}` },
        payload,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.transportType).toBe("SPEEDBOAT");
      expect(body.data.transportOperatorName).toBe("Pak Mansyur");
      expect(body.data.estimatedTravelTimeMinutes).toBe(75);
      expect(body.data.rtkName).toBe("Rumah Tunggu Kelahiran Sehati Nunukan");
      expect(body.data.alternativeNotes).toContain("gelombang tinggi");
    });
  });

  describe("4. Akses Bidan & Otorisasi Penugasan", () => {
    it("Bidan yang ditugaskan dapat melihat P4K ibu binaan", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/p4k`,
        headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.motherPublicId).toBe(devMotherProfile.publicId);
      expect(body.data.checklistProgress.checked).toBe(2);
    });

    it("Bidan yang ditugaskan dapat memperbarui P4K ibu binaan", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/p4k`,
        headers: { authorization: `Bearer ${assignedMidwifeToken}` },
        payload: {
          deliveryAttendant: "BIDAN",
          preparationNotes: "Bidan telah memverifikasi kesiapan tas bersalin dan donor darah keluarga",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.deliveryAttendant).toBe("BIDAN");
      expect(body.data.preparationNotes).toContain("Bidan telah memverifikasi");
    });

    it("Bidan yang ditugaskan dapat melihat dan memperbarui rencana rujukan kepulauan", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/referral-plan`,
        headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.rtkName).toBe("Rumah Tunggu Kelahiran Sehati Nunukan");

      const updateRes = await app.inject({
        method: "PUT",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/referral-plan`,
        headers: { authorization: `Bearer ${assignedMidwifeToken}` },
        payload: {
          rtkAddress: "Jl. Mulawarman No. 5A (Konfirmasi Bidan Desa)",
        },
      });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.json().data.rtkAddress).toContain("Konfirmasi Bidan");
    });

    it("Bidan yang TIDAK ditugaskan ditolak mengakses P4K ibu (404 MOTHER_NOT_ASSIGNED)", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/p4k`,
        headers: { authorization: `Bearer ${unassignedMidwifeToken}` },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("MOTHER_NOT_ASSIGNED");
    });
  });
});
