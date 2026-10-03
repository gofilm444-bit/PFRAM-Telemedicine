import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

describe("Stage 10 — Video Call (Video Consultation) Suite", () => {
  let app: ReturnType<typeof buildApp>;
  let prisma: PrismaClient;

  let motherToken: string;
  let otherMotherToken: string;
  let assignedMidwifeToken: string;
  let unassignedMidwifeToken: string;
  let adminToken: string;

  let testMotherProfile: { id: string; publicId: string; userId: string };
  let threadPublicId: string;
  let createdVideoPublicId: string;

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

    const facility = await prisma.healthFacility.findFirstOrThrow();

    // 2. Dedicated Assigned Midwife for Stage 10
    const midwifePhone = "6281299990010";
    let midwifeUser = await prisma.user.findUnique({
      where: { phoneNumber: midwifePhone },
      include: { midwifeProfile: true },
    });
    if (!midwifeUser) {
      midwifeUser = await prisma.user.create({
        data: {
          phoneNumber: midwifePhone,
          passwordHash: "hash_test_midwife_stage10",
          role: "MIDWIFE",
          status: "ACTIVE",
          midwifeProfile: {
            create: {
              fullName: "Bidan Video Stage 10",
              phoneNumber: midwifePhone,
              primaryFacilityId: facility.id,
              active: true,
              profileCompleted: true,
            },
          },
        },
        include: { midwifeProfile: true },
      });
    }
    assignedMidwifeToken = app.jwt.sign({
      sub: midwifeUser.id,
      publicId: midwifeUser.publicId,
      role: "MIDWIFE",
    });

    // 3. Dedicated Mother for Stage 10
    const motherPhone = "6281399990010";
    let motherUser = await prisma.user.findUnique({
      where: { phoneNumber: motherPhone },
      include: { motherProfile: { include: { pregnancies: true } } },
    });
    if (!motherUser) {
      motherUser = await prisma.user.create({
        data: {
          phoneNumber: motherPhone,
          passwordHash: "hash_test_mother_stage10",
          role: "MOTHER",
          status: "ACTIVE",
          motherProfile: {
            create: {
              fullName: "Ibu Video Stage 10",
              dateOfBirth: new Date("1995-05-15"),
              profileCompleted: true,
              pregnancies: {
                create: {
                  pregnancyNumber: 1,
                  status: "ACTIVE",
                  gestationalAgeSource: "LMP",
                  lastMenstrualPeriod: new Date("2026-01-01"),
                  estimatedDueDate: new Date("2026-10-08"),
                  completedProfile: true,
                },
              },
            },
          },
        },
        include: { motherProfile: { include: { pregnancies: true } } },
      });
    }
    testMotherProfile = motherUser.motherProfile!;
    motherToken = app.jwt.sign({
      sub: motherUser.id,
      publicId: motherUser.publicId,
      role: "MOTHER",
    });

    // Active assignment between them
    const existingAssignment = await prisma.motherMidwifeAssignment.findFirst({
      where: {
        motherId: testMotherProfile.id,
        midwifeId: midwifeUser.midwifeProfile!.id,
        status: "ACTIVE",
      },
    });
    if (!existingAssignment) {
      await prisma.motherMidwifeAssignment.create({
        data: {
          motherId: testMotherProfile.id,
          midwifeId: midwifeUser.midwifeProfile!.id,
          pregnancyId: motherUser.motherProfile!.pregnancies[0]!.id,
          facilityId: facility.id,
          assignedByUserId: admin.id,
          status: "ACTIVE",
        },
      });
    }

    // 4. Other Mother
    const otherPhone = "6281399990020";
    let otherUser = await prisma.user.findUnique({
      where: { phoneNumber: otherPhone },
      include: { motherProfile: true },
    });
    if (!otherUser) {
      otherUser = await prisma.user.create({
        data: {
          phoneNumber: otherPhone,
          passwordHash: "hash_test_other_mother_stage10",
          role: "MOTHER",
          status: "ACTIVE",
          motherProfile: {
            create: {
              fullName: "Ibu Hamil Lain Stage 10",
              dateOfBirth: new Date("1996-01-01"),
              profileCompleted: true,
            },
          },
        },
        include: { motherProfile: true },
      });
    }
    otherMotherToken = app.jwt.sign({
      sub: otherUser.id,
      publicId: otherUser.publicId,
      role: "MOTHER",
    });

    // 5. Unassigned Midwife
    const unassignedPhone = "6281299990020";
    let unassignedUser = await prisma.user.findUnique({
      where: { phoneNumber: unassignedPhone },
      include: { midwifeProfile: true },
    });
    if (!unassignedUser) {
      unassignedUser = await prisma.user.create({
        data: {
          phoneNumber: unassignedPhone,
          passwordHash: "hash_test_unassigned_stage10",
          role: "MIDWIFE",
          status: "ACTIVE",
          midwifeProfile: {
            create: {
              fullName: "Bidan Tidak Ditugaskan Stage 10",
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

    // Ensure test mother has a consultation thread
    const threadRes = await app.inject({
      method: "GET",
      url: "/api/mother/consultation/thread",
      headers: { authorization: `Bearer ${motherToken}` },
    });
    expect(threadRes.statusCode).toBe(200);
    threadPublicId = threadRes.json().data.publicId;

    // Clean up any test video consultations
    await prisma.videoConsultation.deleteMany({
      where: { motherId: testMotherProfile.id },
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("1. Bidan dapat menjadwalkan video call baru dengan meetingUrl HTTPS yang valid", async () => {
    const scheduledAt = new Date(Date.now() + 2 * 3600 * 1000).toISOString(); // 2 jam mendatang
    const res = await app.inject({
      method: "POST",
      url: "/api/midwife/video-consultations",
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      payload: {
        motherPublicId: testMotherProfile.publicId,
        threadPublicId,
        scheduledAt,
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        title: "Konsultasi Video Perkembangan Janin",
        notes: "Ibu dimohon menyiapkan Buku KIA",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.publicId).toBeDefined();
    expect(body.data.motherPublicId).toBe(testMotherProfile.publicId);
    expect(body.data.status).toBe("SCHEDULED");
    expect(body.data.meetingUrl).toBe("https://meet.google.com/abc-defg-hij");
    expect(body.data.title).toBe("Konsultasi Video Perkembangan Janin");
    expect(body.data.notes).toBe("Ibu dimohon menyiapkan Buku KIA");
    createdVideoPublicId = body.data.publicId;
  });

  it("2. Validasi URL menolak tautan non-HTTPS atau scheme berbahaya (http, javascript)", async () => {
    const scheduledAt = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    // HTTP tidak aman
    const resHttp = await app.inject({
      method: "POST",
      url: "/api/midwife/video-consultations",
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      payload: {
        motherPublicId: testMotherProfile.publicId,
        scheduledAt,
        meetingUrl: "http://insecure.meet.com/room",
        title: "Test HTTP",
      },
    });
    expect(resHttp.statusCode).toBe(400);

    // Javascript scheme
    const resJs = await app.inject({
      method: "POST",
      url: "/api/midwife/video-consultations",
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      payload: {
        motherPublicId: testMotherProfile.publicId,
        scheduledAt,
        meetingUrl: "javascript:alert('pwned')",
        title: "Test XSS",
      },
    });
    expect(resJs.statusCode).toBe(400);
  });

  it("3. Bidan tanpa penugasan aktif (unassigned) ditolak dengan 403 saat menjadwalkan video call", async () => {
    const scheduledAt = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
    const res = await app.inject({
      method: "POST",
      url: "/api/midwife/video-consultations",
      headers: { authorization: `Bearer ${unassignedMidwifeToken}` },
      payload: {
        motherPublicId: testMotherProfile.publicId,
        scheduledAt,
        meetingUrl: "https://meet.google.com/xyz-1234-abc",
        title: "Konsultasi Tidak Sah",
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("NOT_ASSIGNED_MIDWIFE");
  });

  it("4. Ibu dapat melihat jadwal video call mendatang pada /upcoming", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/video-consultations/upcoming",
      headers: { authorization: `Bearer ${motherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).not.toBeNull();
    expect(body.data.publicId).toBe(createdVideoPublicId);
    expect(body.data.status).toBe("SCHEDULED");
    expect(body.data.meetingUrl).toBe("https://meet.google.com/abc-defg-hij");
    expect(body.data.midwifeName).toBeDefined();
  });

  it("5. Isolasi Ibu: Ibu lain tidak melihat jadwal video call ibu pertama", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/video-consultations/upcoming",
      headers: { authorization: `Bearer ${otherMotherToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toBeNull();
  });

  it("6. Admin ditolak saat mengakses endpoint konsultasi video ibu atau bidan (Admin Isolation)", async () => {
    const resMother = await app.inject({
      method: "GET",
      url: "/api/mother/video-consultations/upcoming",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(resMother.statusCode).toBe(403);

    const resMidwife = await app.inject({
      method: "GET",
      url: "/api/midwife/video-consultations",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(resMidwife.statusCode).toBe(403);
  });

  it("7. Bidan dapat melihat daftar jadwal video call ibu binaannya", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/midwife/video-consultations?motherPublicId=${testMotherProfile.publicId}`,
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeGreaterThan(0);
    expect(body.data.items[0].publicId).toBe(createdVideoPublicId);
  });

  it("8. Bidan dapat mengubah jadwal (reschedule) dan catatan video call", async () => {
    const newScheduledAt = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/midwife/video-consultations/${createdVideoPublicId}`,
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      payload: {
        scheduledAt: newScheduledAt,
        meetingUrl: "https://meet.jit.si/pfram-rescheduled-call",
        notes: "Jadwal dimundurkan 2 jam sesuai kesepakatan chat",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.meetingUrl).toBe("https://meet.jit.si/pfram-rescheduled-call");
    expect(body.data.notes).toBe("Jadwal dimundurkan 2 jam sesuai kesepakatan chat");
  });

  it("9. Bidan dapat menandai video call selesai secara administratif (COMPLETED)", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/midwife/video-consultations/${createdVideoPublicId}/status`,
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      payload: {
        status: "COMPLETED",
        notes: "Konsultasi tatap muka virtual telah selesai dilaksanakan dengan baik",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("COMPLETED");
    expect(body.data.completedAt).not.toBeNull();

    // Pastikan tidak lagi muncul di upcoming
    const upcomingRes = await app.inject({
      method: "GET",
      url: "/api/mother/video-consultations/upcoming",
      headers: { authorization: `Bearer ${motherToken}` },
    });
    expect(upcomingRes.statusCode).toBe(200);
    expect(upcomingRes.json().data).toBeNull();
  });

  it("10. Bidan dapat membatalkan video call (CANCELLED)", async () => {
    // Buat satu lagi untuk dibatalkan
    const createRes = await app.inject({
      method: "POST",
      url: "/api/midwife/video-consultations",
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      payload: {
        motherPublicId: testMotherProfile.publicId,
        scheduledAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
        meetingUrl: "https://meet.google.com/cancel-test-123",
        title: "Video Call Untuk Dibatalkan",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const toCancelId = createRes.json().data.publicId;

    const cancelRes = await app.inject({
      method: "PATCH",
      url: `/api/midwife/video-consultations/${toCancelId}/status`,
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      payload: {
        status: "CANCELLED",
        notes: "Dibatalkan karena bidan ada rujukan darurat di faskes",
      },
    });
    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.json().data.status).toBe("CANCELLED");
    expect(cancelRes.json().data.cancelledAt).not.toBeNull();
  });
});
