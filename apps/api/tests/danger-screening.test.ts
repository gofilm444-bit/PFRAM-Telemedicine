import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

describe("Stage 6A — Danger Signs & Basic Screening Suite", () => {
  let app: ReturnType<typeof buildApp>;
  let prisma: PrismaClient;

  let adminToken: string;
  let motherToken: string;
  let otherMotherToken: string;
  let t1MotherToken: string;
  let assignedMidwifeToken: string;
  let unassignedMidwifeToken: string;

  let devMotherProfile: { id: string; publicId: string };
  let devFacility: { id: string; publicId: string };

  let createdDangerPublicId: string;

  beforeAll(async () => {
    const env = {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://pfram:pfram_dev_only@localhost:5433/pfram_db?schema=public",
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

    // 3. Mother (628133333333) — Seed pregnancy has LMP 2026-06-01 (Trimester 2/3)
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

    // 4. Facility
    devFacility = await prisma.healthFacility.findFirstOrThrow({
      where: { name: "Puskesmas Pilot PFRAM (Development)" },
    });

    // 5. Secondary mother for isolation test
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

    // 6. Trimester 1 Mother (LMP 6 weeks ago)
    const t1MotherPhone = "6281399990003";
    const sixWeeksAgo = new Date(Date.now() - 42 * 24 * 3600 * 1000);
    let t1MotherUser = await prisma.user.findUnique({
      where: { phoneNumber: t1MotherPhone },
      include: { motherProfile: { include: { pregnancies: true } } },
    });
    if (!t1MotherUser) {
      t1MotherUser = await prisma.user.create({
        data: {
          phoneNumber: t1MotherPhone,
          passwordHash: "hash_test_t1_mother",
          role: "MOTHER",
          status: "ACTIVE",
          motherProfile: {
            create: {
              fullName: "Ibu Trimester Satu",
              dateOfBirth: new Date("1998-03-20"),
              address: "Jalan Trimester 1 No. 5",
              primaryFacilityId: devFacility.id,
              profileCompleted: true,
              pregnancies: {
                create: {
                  pregnancyNumber: 1,
                  gestationalAgeSource: "LMP",
                  lastMenstrualPeriod: sixWeeksAgo,
                  estimatedDueDate: new Date(
                    sixWeeksAgo.getTime() + 280 * 24 * 3600 * 1000,
                  ),
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
    t1MotherToken = app.jwt.sign({
      sub: t1MotherUser.id,
      publicId: t1MotherUser.publicId,
      role: "MOTHER",
    });

    // 7. Unassigned Midwife
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
  // 1. GET ACTIVE RULES & TRIMESTER FILTERING
  // ==============================================================
  it("1. Get Active Rules: Mengambil daftar aturan dari versi aktif KEMENKES-KIA-2024-V1", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/danger-signs",
      headers: { authorization: `Bearer ${motherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.ruleSet.version).toBe("KEMENKES-KIA-2024-V1");
    expect(body.data.rules).toBeInstanceOf(Array);
    expect(body.data.rules.length).toBe(10);
  });

  it("2. Trimester 1 Filter: Hanya memuat aturan relevan untuk Trimester 1 termasuk DYSURIA_VAGINAL_DISCHARGE", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/danger-signs",
      headers: { authorization: `Bearer ${t1MotherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.pregnancy.trimester).toBe(1);

    const codes = body.data.rules.map((r: { code: string }) => r.code);
    expect(codes).toContain("BLEEDING");
    expect(codes).toContain("HIGH_FEVER");
    expect(codes).toContain("SEVERE_VOMITING");
    expect(codes).toContain("SEVERE_ABDOMINAL_PAIN");
    expect(codes).toContain("SEIZURE");
    expect(codes).toContain("DYSURIA_VAGINAL_DISCHARGE");
    expect(codes).not.toContain("DECREASED_FETAL_MOVEMENT");
    expect(codes).not.toContain("PREMATURE_FLUID_LEAK");
    expect(codes).not.toContain("SEVERE_HEADACHE_BLURRED_VISION");
    expect(codes).not.toContain("FACIAL_HAND_SWELLING");
    expect(codes.length).toBe(6);
  });

  it("3. Trimester 2 & 3 Filter: Memuat 10 aturan lengkap termasuk gerakan janin, cairan ketuban, dan disuria", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/danger-signs",
      headers: { authorization: `Bearer ${motherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    const codes = body.data.rules.map((r: { code: string }) => r.code);
    expect(codes).toContain("DECREASED_FETAL_MOVEMENT");
    expect(codes).toContain("PREMATURE_FLUID_LEAK");
    expect(codes).toContain("SEVERE_HEADACHE_BLURRED_VISION");
    expect(codes).toContain("FACIAL_HAND_SWELLING");
    expect(codes).toContain("DYSURIA_VAGINAL_DISCHARGE");
    expect(codes.length).toBe(10);
  });

  // ==============================================================
  // 2. CREATE SCREENINGS (NON-DIAGNOSTIC STATUS EVALUATION)
  // ==============================================================
  it("4. Create No-Danger Screening: Mengembalikan NO_DANGER_REPORTED dan wording non-diagnostik saat semua jawaban TIDAK", async () => {
    const rulesRes = await app.inject({
      method: "GET",
      url: "/api/mother/danger-signs",
      headers: { authorization: `Bearer ${motherToken}` },
    });
    const rules = rulesRes.json().data.rules;

    const payload = {
      ruleSetVersion: "KEMENKES-KIA-2024-V1",
      responses: rules.map((r: { code: string }) => ({
        ruleCode: r.code,
        answer: false,
      })),
    };

    const res = await app.inject({
      method: "POST",
      url: "/api/mother/danger-screenings",
      headers: { authorization: `Bearer ${motherToken}` },
      payload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("NO_DANGER_REPORTED");
    expect(body.data.reportedSignsCount).toBe(0);
    expect(body.data.summary).toBe(
      "Tidak ada tanda bahaya yang Anda laporkan pada screening ini. Jika kondisi berubah atau Anda merasa khawatir, hubungi tenaga kesehatan.",
    );
    expect(body.data.summary).not.toMatch(
      /kondisi normal|kehamilan normal|ibu sehat|tidak ada masalah/i,
    );
    const reported = body.data.responses.filter((r: { answer: boolean }) => r.answer);
    expect(reported).toEqual([]);
    expect(body.data.publicId).toBeDefined();
  });

  it("5. Create Danger Screening: Mengembalikan REQUIRES_IMMEDIATE_CARE jika ada gejala URGENT", async () => {
    const rulesRes = await app.inject({
      method: "GET",
      url: "/api/mother/danger-signs",
      headers: { authorization: `Bearer ${motherToken}` },
    });
    const rules = rulesRes.json().data.rules;

    const payload = {
      ruleSetVersion: "KEMENKES-KIA-2024-V1",
      responses: rules.map((r: { code: string }) => ({
        ruleCode: r.code,
        answer: r.code === "BLEEDING", // Bleeding is URGENT
      })),
    };

    const res = await app.inject({
      method: "POST",
      url: "/api/mother/danger-screenings",
      headers: { authorization: `Bearer ${motherToken}` },
      payload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    createdDangerPublicId = body.data.publicId;
    expect(body.data.status).toBe("REQUIRES_IMMEDIATE_CARE");
    expect(body.data.reportedSignsCount).toBe(1);
    expect(body.data.summary).toBe(
      "Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi.",
    );
    const reported = body.data.responses.filter((r: { answer: boolean }) => r.answer);
    expect(reported[0].ruleCode).toBe("BLEEDING");
    expect(body.data.followUpStatus).toBe("PENDING");
  });

  it("6. Create Warning Screening: Mengembalikan DANGER_SIGN_REPORTED jika hanya ada gejala WARNING", async () => {
    const rulesRes = await app.inject({
      method: "GET",
      url: "/api/mother/danger-signs",
      headers: { authorization: `Bearer ${t1MotherToken}` },
    });
    const rules = rulesRes.json().data.rules;

    const payload = {
      ruleSetVersion: "KEMENKES-KIA-2024-V1",
      responses: rules.map((r: { code: string }) => ({
        ruleCode: r.code,
        answer: r.code === "SEVERE_VOMITING", // SEVERE_VOMITING is WARNING
      })),
    };

    const res = await app.inject({
      method: "POST",
      url: "/api/mother/danger-screenings",
      headers: { authorization: `Bearer ${t1MotherToken}` },
      payload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("DANGER_SIGN_REPORTED");
    expect(body.data.reportedSignsCount).toBe(1);
    expect(body.data.summary).toBe(
      "Anda melaporkan tanda yang perlu diperiksa oleh tenaga kesehatan.",
    );
    const reported = body.data.responses.filter((r: { answer: boolean }) => r.answer);
    expect(reported[0].severityCategory).toBe("WARNING");
    expect(body.data.publicId).toBeDefined();
  });

  // ==============================================================
  // 3. VALIDATION & SECURITY REJECTIONS
  // ==============================================================
  it("7. Empty Responses Rejected: Penolakan HTTP 400 jika array respon kosong", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/mother/danger-screenings",
      headers: { authorization: `Bearer ${motherToken}` },
      payload: {
        ruleSetVersion: "KEMENKES-KIA-2024-V1",
        responses: [],
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("8. Duplicate Rule Response Rejected: Penolakan HTTP 400 jika ada duplikasi ruleCode", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/mother/danger-screenings",
      headers: { authorization: `Bearer ${motherToken}` },
      payload: {
        ruleSetVersion: "KEMENKES-KIA-2024-V1",
        responses: [
          { ruleCode: "BLEEDING", answer: false },
          { ruleCode: "BLEEDING", answer: true },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("9. Inactive / Invalid Rule Rejected: Penolakan HTTP 400 jika menjawab kode tidak valid", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/mother/danger-screenings",
      headers: { authorization: `Bearer ${motherToken}` },
      payload: {
        ruleSetVersion: "KEMENKES-KIA-2024-V1",
        responses: [{ ruleCode: "NON_EXISTENT_RULE", answer: true }],
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_RULE_CODE");
  });

  it("9b. Legacy Inactive Ruleset Rejected for New Screening: Penolakan saat submit versi inaktif 2023", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/mother/danger-screenings",
      headers: { authorization: `Bearer ${motherToken}` },
      payload: {
        ruleSetVersion: "KEMENKES-KIA-2023-V1",
        responses: [{ ruleCode: "BLEEDING", answer: false }],
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_RULE_VERSION");
  });

  // ==============================================================
  // 4. AUTHORIZATION & CLINICAL ISOLATION (ANTI-IDOR)
  // ==============================================================
  it("10. Mother Isolation: Ibu tidak dapat melihat skrining ibu lain (Anti-IDOR)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/mother/danger-screenings/${createdDangerPublicId}`,
      headers: { authorization: `Bearer ${otherMotherToken}` },
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.success).toBe(false);
  });

  it("11. Midwife Active Assignment: Bidan berpenugasan aktif dapat melihat skrining ibu binaannya", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/midwife/mothers/${devMotherProfile.publicId}/danger-screenings`,
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.items).toBeInstanceOf(Array);
    expect(body.data.total).toBeGreaterThan(0);
  });

  it("12. Unassigned Midwife Denied: Bidan tanpa penugasan aktif ditolak", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/midwife/mothers/${devMotherProfile.publicId}/danger-screenings`,
      headers: { authorization: `Bearer ${unassignedMidwifeToken}` },
    });

    expect([403, 404]).toContain(res.statusCode);
    const body = res.json();
    expect(body.success).toBe(false);
  });

  it("13. Admin Clinical Isolation: Admin ditolak membuka data skrining perorangan", async () => {
    const resMother = await app.inject({
      method: "GET",
      url: "/api/mother/danger-screenings",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(resMother.statusCode).toBe(403);

    const resMidwife = await app.inject({
      method: "GET",
      url: `/api/midwife/mothers/${devMotherProfile.publicId}/danger-screenings`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(resMidwife.statusCode).toBe(403);

    // Admin can view danger rules
    const resRules = await app.inject({
      method: "GET",
      url: "/api/admin/danger-rules",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(resRules.statusCode).toBe(200);
    expect(resRules.json().data).toBeInstanceOf(Array);
  });

  // ==============================================================
  // 5. HISTORY, DETAIL & FOLLOW-UP LIFECYCLE
  // ==============================================================
  it("14. Screening History List: Daftar riwayat tersortir kronologis terbaru", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/danger-screenings?page=1&limit=10",
      headers: { authorization: `Bearer ${motherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeGreaterThanOrEqual(2);
    // Chronological order verification
    const dates = body.data.items.map((i: { screenedAt: string }) =>
      new Date(i.screenedAt).getTime(),
    );
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
    }
  });

  it("15. Screening Detail: Detail memuat butir pertanyaan, jawaban, dan kategori keparahan", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/mother/danger-screenings/${createdDangerPublicId}`,
      headers: { authorization: `Bearer ${motherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.publicId).toBe(createdDangerPublicId);
    expect(body.data.responses).toBeInstanceOf(Array);
    expect(body.data.responses.length).toBeGreaterThan(0);
    expect(body.data.responses[0]).toHaveProperty("ruleCode");
    expect(body.data.responses[0]).toHaveProperty("question");
    expect(body.data.responses[0]).toHaveProperty("answer");
    expect(body.data.responses[0]).toHaveProperty("severityCategory");
  });

  it("16. Follow-Up List: Bidan dapat melihat antrean skrining yang butuh tindak lanjut", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/midwife/danger-follow-ups",
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.items).toBeInstanceOf(Array);
    const item = body.data.items.find(
      (i: { publicId: string }) => i.publicId === createdDangerPublicId,
    );
    expect(item).toBeDefined();
    expect(item.mother.fullName).toBe("Ibu Development");
    expect(item.followUpStatus).toBe("PENDING");
  });

  it("17. Follow-Up Update: Bidan dapat memperbarui status tindak lanjut dan catatan", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/midwife/danger-screenings/${createdDangerPublicId}/follow-up`,
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      payload: {
        status: "CONTACTED",
        notes: "Sudah dihubungi via telepon, diarahkan segera ke IGD Puskesmas.",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.followUpStatus).toBe("CONTACTED");
    expect(body.data.followUpNotes).toContain("diarahkan segera ke IGD");
  });

  it("18. Invalid Follow-Up Transition Rejected: Penolakan status tidak sah", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/midwife/danger-screenings/${createdDangerPublicId}/follow-up`,
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      payload: {
        status: "NON_EXISTENT_STATUS",
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
  });

  it("19. Archived Screening Hidden: Skrining yang diarsipkan tidak muncul di antrean", async () => {
    // Soft-archive createdDangerPublicId
    await prisma.dangerScreening.update({
      where: { publicId: createdDangerPublicId },
      data: { archivedAt: new Date() },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/midwife/danger-follow-ups",
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    const item = body.data.items.find(
      (i: { publicId: string }) => i.publicId === createdDangerPublicId,
    );
    expect(item).toBeUndefined();

    // Restore for audit verification
    await prisma.dangerScreening.update({
      where: { publicId: createdDangerPublicId },
      data: { archivedAt: null },
    });
  });

  it("20. Audit Logs: Memastikan pencatatan audit log DANGER_SCREENING_CREATED dan DANGER_FOLLOWUP_UPDATED", async () => {
    const createLog = await prisma.auditLog.findFirst({
      where: {
        action: "DANGER_SCREENING_CREATED",
        entityId: createdDangerPublicId,
      },
    });
    expect(createLog).not.toBeNull();
    expect(createLog?.result).toBe("SUCCESS");

    const followUpLog = await prisma.auditLog.findFirst({
      where: {
        action: "DANGER_FOLLOWUP_UPDATED",
        entityId: createdDangerPublicId,
      },
    });
    expect(followUpLog).not.toBeNull();
    expect(followUpLog?.result).toBe("SUCCESS");
  });
});
