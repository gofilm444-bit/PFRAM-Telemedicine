import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

describe("Stage 5A — Smart ANC Reminder & Kepatuhan Suite", () => {
  let app: ReturnType<typeof buildApp>;
  let prisma: PrismaClient;

  let adminToken: string;
  let motherToken: string;
  let otherMotherToken: string;
  let assignedMidwifeToken: string;
  let unassignedMidwifeToken: string;

  let devMotherProfile: { id: string; publicId: string };
  let devPregnancy: { id: string; publicId: string };
  let devFacility: { id: string; publicId: string };

  let createdSchedulePublicId: string;

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
    otherMotherToken = app.jwt.sign({
      sub: otherMotherUser.id,
      publicId: otherMotherUser.publicId,
      role: "MOTHER",
    });

    // 6. Unassigned Midwife
    const unassignedPhone = "6281299990002";
    let unassignedUser = await prisma.user.findUnique({
      where: { phoneNumber: unassignedPhone },
      include: { midwifeProfile: true },
    });
    if (!unassignedUser) {
      unassignedUser = await prisma.user.create({
        data: {
          phoneNumber: unassignedPhone,
          passwordHash: "hash_test_unassigned_midwife",
          role: "MIDWIFE",
          status: "ACTIVE",
          midwifeProfile: {
            create: {
              fullName: "Bidan Tanpa Penugasan",
              phoneNumber: unassignedPhone,
              primaryFacilityId: devFacility.id,
              profileCompleted: true,
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
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // ==============================================================
  // 1. MIDWIFE: Create ANC Schedule with Authorization Check
  // ==============================================================
  describe("Midwife ANC Scheduling", () => {
    it("1.1. Bidan tanpa penugasan aktif ditolak dengan 403 saat membuat jadwal", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/anc-schedules?status=SCHEDULED&sort=desc`,
        headers: { authorization: `Bearer ${unassignedMidwifeToken}` },
        payload: {
          scheduledAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          visitType: "ANC",
          notes: "Uji otorisasi penugasan",
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("FORBIDDEN");
    });

    it("1.2. Validasi input: format tanggal jadwal tidak valid ditolak 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/anc-schedules?status=SCHEDULED&sort=desc`,
        headers: { authorization: `Bearer ${assignedMidwifeToken}` },
        payload: {
          scheduledAt: "invalid-date-format",
          visitType: "ANC",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("1.3. Bidan pendamping berhasil menjadwalkan ANC baru dan otomatis membuat reminder", async () => {
      const scheduledDate = new Date(Date.now() + 14 * 24 * 3600 * 1000);
      const res = await app.inject({
        method: "POST",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/anc-schedules?status=SCHEDULED&sort=desc`,
        headers: { authorization: `Bearer ${assignedMidwifeToken}` },
        payload: {
          scheduledAt: scheduledDate.toISOString(),
          visitType: "DOCTOR_ANC",
          doctorRequired: true,
          facilityPublicId: devFacility.publicId,
          notes: "Pemeriksaan USG Trimester 2 dengan Dokter Spesialis",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.visitType).toBe("DOCTOR_ANC");
      expect(body.data.doctorRequired).toBe(true);
      expect(body.data.status).toBe("SCHEDULED");
      expect(body.data.notes).toContain("USG Trimester 2");

      createdSchedulePublicId = body.data.publicId;

      // Verify automatic reminder created in DB
      const sched = await prisma.ancSchedule.findUniqueOrThrow({
        where: { publicId: createdSchedulePublicId },
      });
      const reminder = await prisma.reminder.findFirst({
        where: {
          ancScheduleId: sched.id,
        },
      });
      expect(reminder).toBeDefined();
      expect(reminder?.status).toBe("PENDING");
    });

    it("1.4. Bidan dapat melihat daftar jadwal ANC ibu binaan", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/anc-schedules?status=SCHEDULED&sort=desc`,
        headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.items.length).toBeGreaterThanOrEqual(1);
      const found = body.data.items.find(
        (i: { publicId: string }) => i.publicId === createdSchedulePublicId,
      );
      expect(found).toBeDefined();
    });

    it("1.5. Bidan dapat mengubah jadwal ANC (reschedule / ganti catatan)", async () => {
      const newDate = new Date(Date.now() + 21 * 24 * 3600 * 1000);
      const res = await app.inject({
        method: "PATCH",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/anc-schedules/${createdSchedulePublicId}`,
        headers: { authorization: `Bearer ${assignedMidwifeToken}` },
        payload: {
          scheduledAt: newDate.toISOString(),
          notes: "Jadwal digeser sesuai permintaan ibu",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.notes).toBe("Jadwal digeser sesuai permintaan ibu");
    });
  });

  // ==============================================================
  // 2. MOTHER: Schedules, Reminders, and Confirmation
  // ==============================================================
  describe("Mother ANC & Reminder Flow", () => {
    it("2.1. Ibu dapat melihat jadwal kunjungan mendatang", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/mother/anc-schedules/upcoming",
        headers: { authorization: `Bearer ${motherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.status).toBe("SCHEDULED");
    });

    it("2.2. Ibu dapat melihat detail jadwal kunjungan", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/mother/anc-schedules/${createdSchedulePublicId}`,
        headers: { authorization: `Bearer ${motherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.publicId).toBe(createdSchedulePublicId);
      expect(body.data.doctorRequired).toBe(true);
    });

    it("2.3. Ibu dapat mengonfirmasi kehadiran pemeriksaan ('Sudah Datang')", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/mother/anc-schedules/${createdSchedulePublicId}/confirm-attendance`,
        headers: { authorization: `Bearer ${motherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.status).toBe("COMPLETED");
      expect(body.data.completedAt).toBeDefined();
    });

    it("2.4. Ibu lain tidak dapat mengonfirmasi jadwal milik ibu yang bukan miliknya", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/mother/anc-schedules/${createdSchedulePublicId}/confirm-attendance`,
        headers: { authorization: `Bearer ${otherMotherToken}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==============================================================
  // 3. REMINDER SETTINGS & TTD REMINDER FLOW
  // ==============================================================
  describe("Reminder Settings & Tablet Tambah Darah (TTD)", () => {
    it("3.1. Ibu dapat membaca pengaturan reminder default", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/mother/reminder-settings",
        headers: { authorization: `Bearer ${motherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(typeof body.data.ironTabletEnabled).toBe("boolean");
      expect(typeof body.data.ironTabletTime).toBe("string");
      expect(typeof body.data.ancReminderEnabled).toBe("boolean");
    });

    it("3.2. Ibu dapat mengubah pengaturan jam reminder", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/api/mother/reminder-settings",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: {
          ironTabletTime: "21:30",
          ancReminderDaysBefore: 2,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.ironTabletTime).toBe("21:30");
      expect(body.data.ancReminderDaysBefore).toBe(2);
    });

    it("3.3. Validasi pengaturan jam salah ditolak 400", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/api/mother/reminder-settings",
        headers: { authorization: `Bearer ${motherToken}` },
        payload: {
          ironTabletTime: "25:99",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("3.4. Ibu dapat menunda (snooze) reminder TTD selama 10, 30, atau 60 menit", async () => {
      // Create a test TTD reminder
      const ttdReminder = await prisma.reminder.create({
        data: {
          motherId: devMotherProfile.id,
          pregnancyId: devPregnancy.id,
          type: "IRON_TABLET",
          scheduledAt: new Date(),
          reminderTime: "21:30",
          status: "PENDING",
        },
      });

      const res = await app.inject({
        method: "POST",
        url: `/api/mother/reminders/${ttdReminder.publicId}/snooze`,
        headers: { authorization: `Bearer ${motherToken}` },
        payload: { minutes: 30 },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.status).toBe("SNOOZED");
      expect(body.data.snoozedUntil).toBeDefined();

      // Snooze with invalid minutes rejected
      const invalidRes = await app.inject({
        method: "POST",
        url: `/api/mother/reminders/${ttdReminder.publicId}/snooze`,
        headers: { authorization: `Bearer ${motherToken}` },
        payload: { minutes: 45 },
      });
      expect(invalidRes.statusCode).toBe(400);
    });

    it("3.5. Ibu dapat menandai 'Sudah Minum' pada reminder TTD", async () => {
      const ttdReminder = await prisma.reminder.create({
        data: {
          motherId: devMotherProfile.id,
          pregnancyId: devPregnancy.id,
          type: "IRON_TABLET",
          scheduledAt: new Date(),
          reminderTime: "21:30",
          status: "PENDING",
        },
      });

      const res = await app.inject({
        method: "POST",
        url: `/api/mother/reminders/${ttdReminder.publicId}/complete`,
        headers: { authorization: `Bearer ${motherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.status).toBe("COMPLETED");
      expect(body.data.completedAt).toBeDefined();
    });
  });

  // ==============================================================
  // 4. ADHERENCE SUMMARY & RECAP
  // ==============================================================
  describe("Adherence Summary & Recommendations", () => {
    it("4.1. Ibu dapat membaca ringkasan kepatuhan dasar (adherence summary)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/mother/adherence-summary",
        headers: { authorization: `Bearer ${motherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.ironTabletsTotal).toBeGreaterThanOrEqual(1);
      expect(body.data.ironTabletsCompleted).toBeGreaterThanOrEqual(1);
      expect(body.data.ironTabletsAdherencePercentage).toBeGreaterThanOrEqual(0);
      expect(body.data.ancCompleted).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(body.data.recentHistory)).toBe(true);
    });

    it("4.2. Bidan pendamping dapat melihat ringkasan kepatuhan ibu binaan", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/midwife/mothers/${devMotherProfile.publicId}/adherence-summary`,
        headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.ironTabletsCompleted).toBeGreaterThanOrEqual(1);
    });

    it("4.3. Bidan dapat mengakses daftar kunjungan terlewat/belum dikonfirmasi (Missed ANC)", async () => {
      // Create an overdue schedule
      const pastDate = new Date(Date.now() - 5 * 24 * 3600 * 1000);
      await prisma.ancSchedule.create({
        data: {
          motherId: devMotherProfile.id,
          pregnancyId: devPregnancy.id,
          scheduledAt: pastDate,
          visitType: "ANC",
          status: "SCHEDULED",
          notes: "Kontrol terlewat untuk tes missed",
          createdByUserId: (
            await prisma.user.findUniqueOrThrow({
              where: { phoneNumber: "628122222222" },
            })
          ).id,
        },
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/midwife/anc-missed",
        headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.items.length).toBeGreaterThanOrEqual(1);
      const overdue = body.data.items.find(
        (i: { notes: string | null; daysOverdue: number; mother: { fullName: string } }) =>
          i.notes === "Kontrol terlewat untuk tes missed",
      );
      expect(overdue).toBeDefined();
      expect(overdue.daysOverdue).toBeGreaterThanOrEqual(4);
      expect(overdue.mother.fullName).toBeDefined();
    });

    it("4.4. Rekomendasi standar Kemenkes dapat diakses oleh ibu hamil", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/mother/anc-recommendations",
        headers: { authorization: `Bearer ${motherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.recommendations.trimester1).toBeDefined();
      expect(body.data.recommendations.trimester2).toBeDefined();
      expect(body.data.recommendations.trimester3).toBeDefined();
      expect(body.data.ruleSet.minimumVisits).toBe(6);
      expect(body.data.ruleSet.minimumDoctorVisits).toBe(2);
    });

    it("4.5. Admin dapat mengakses daftar aturan standar ANC", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/anc-rules",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
