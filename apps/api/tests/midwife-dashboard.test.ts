import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

describe("Stage 11 — Midwife Dashboard & Home Visit API Suite", () => {
  let app: ReturnType<typeof buildApp>;
  let prisma: PrismaClient;

  let midwifeToken: string;
  let motherToken: string;
  let devMotherProfile: { id: string; publicId: string };
  let createdVisitPublicId: string;

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

    // Midwife and Mother with active assignment
    const assignment = await prisma.motherMidwifeAssignment.findFirstOrThrow({
      where: { status: "ACTIVE" },
      include: {
        midwife: { include: { user: true } },
        mother: { include: { user: true } },
      },
    });

    midwifeToken = app.jwt.sign({
      sub: assignment.midwife.userId,
      publicId: assignment.midwife.user.publicId,
      role: "MIDWIFE",
    });

    devMotherProfile = assignment.mother;
    motherToken = app.jwt.sign({
      sub: assignment.mother.userId,
      publicId: assignment.mother.user.publicId,
      role: "MOTHER",
    });
  });

  afterAll(async () => {
    if (createdVisitPublicId) {
      await prisma.homeVisitSchedule.deleteMany({
        where: { publicId: createdVisitPublicId },
      });
    }
    await app.close();
    await prisma.$disconnect();
  });

  it("1. Midwife dapat mengambil ringkasan dashboard operasional", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/midwife/dashboard/summary",
      headers: { authorization: `Bearer ${midwifeToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("activeMothersCount");
    expect(body.data).toHaveProperty("todayMonitoringCount");
    expect(body.data).toHaveProperty("todayAncCount");
    expect(body.data).toHaveProperty("unconfirmedAncCount");
    expect(body.data).toHaveProperty("pendingDangerScreeningCount");
    expect(body.data).toHaveProperty("unreadConsultationCount");
    expect(body.data).toHaveProperty("todayVideoCallCount");
    expect(body.data).toHaveProperty("todayHomeVisitCount");
  });

  it("2. Midwife dapat mengambil daftar prioritas tindak lanjut (attention)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/midwife/dashboard/attention",
      headers: { authorization: `Bearer ${midwifeToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  it("3. Midwife dapat mengambil jadwal hari ini", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/midwife/dashboard/schedule/today",
      headers: { authorization: `Bearer ${midwifeToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  it("4. Midwife dapat menjadwalkan kunjungan rumah baru", async () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(10, 0, 0, 0);

    const res = await app.inject({
      method: "POST",
      url: "/api/midwife/home-visits",
      headers: { authorization: `Bearer ${midwifeToken}` },
      payload: {
        motherPublicId: devMotherProfile.publicId,
        scheduledAt: nextWeek.toISOString(),
        purpose: "Kunjungan rumah uji coba otomatis",
        notes: "Akses dermaga perahu",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.purpose).toBe("Kunjungan rumah uji coba otomatis");
    expect(body.data.status).toBe("SCHEDULED");
    createdVisitPublicId = body.data.publicId;
  });

  it("5. Midwife dapat memperbarui status kunjungan rumah", async () => {
    expect(createdVisitPublicId).toBeDefined();

    const res = await app.inject({
      method: "PATCH",
      url: `/api/midwife/home-visits/${createdVisitPublicId}`,
      headers: { authorization: `Bearer ${midwifeToken}` },
      payload: {
        status: "COMPLETED",
        notes: "Kunjungan terlaksana dengan baik",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("COMPLETED");
  });

  it("6. Ibu dapat melihat daftar kunjungan rumah miliknya", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/home-visits",
      headers: { authorization: `Bearer ${motherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  it("7. Anti-IDOR: Bidan ditolak (403/404) jika membuat kunjungan untuk ibu di luar binaannya", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/midwife/home-visits",
      headers: { authorization: `Bearer ${midwifeToken}` },
      payload: {
        motherPublicId: "00000000-0000-0000-0000-000000000099",
        scheduledAt: new Date().toISOString(),
        purpose: "Kunjungan tanpa penugasan",
      },
    });

    expect([403, 404]).toContain(res.statusCode);
  });
});
