import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

describe("Stage 9 — Telekonsultasi Ibu & Bidan Suite", () => {
  let app: ReturnType<typeof buildApp>;
  let prisma: PrismaClient;

  let motherToken: string;
  let assignedMidwifeToken: string;
  let unassignedMidwifeToken: string;
  let adminToken: string;

  let devMotherProfile: { id: string; publicId: string; userId: string };
  let threadPublicId: string;
  let photoAttachmentPublicId: string;

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

    // 1. Admin (628111111111)
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
    // Ensure service hours and SLA defaults exist
    await prisma.midwifeProfile.update({
      where: { id: midwife.midwifeProfile!.id },
      data: {
        serviceStartTime: "08:00",
        serviceEndTime: "16:00",
        estimatedResponseMinutes: 60,
      },
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
    motherToken = app.jwt.sign({
      sub: mother.id,
      publicId: mother.publicId,
      role: "MOTHER",
    });

    // 4. Unassigned Midwife
    const unassignedPhone = "6281299990009";
    let unassignedUser = await prisma.user.findUnique({
      where: { phoneNumber: unassignedPhone },
      include: { midwifeProfile: true },
    });
    if (!unassignedUser) {
      unassignedUser = await prisma.user.create({
        data: {
          phoneNumber: unassignedPhone,
          passwordHash: "hash_test_unassigned_stage9",
          role: "MIDWIFE",
          status: "ACTIVE",
          midwifeProfile: {
            create: {
              fullName: "Bidan Tidak Ditugaskan Stage 9",
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

    // Clean up any existing threads for test mother
    await prisma.consultationThread.deleteMany({
      where: { motherId: devMotherProfile.id },
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("1. Ibu dapat mengambil/menginisialisasi thread telekonsultasi aktif beserta info bidan", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/consultation/thread",
      headers: { authorization: `Bearer ${motherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("OPEN");
    expect(body.data.attentionFlag).toBe("NORMAL");
    expect(body.data.midwife.fullName).toBeDefined();
    expect(body.data.midwife.phoneNumber).toBeDefined();
    expect(body.data.midwife.serviceStartTime).toBe("08:00");
    expect(body.data.midwife.serviceEndTime).toBe("16:00");
    expect(body.data.midwife.estimatedResponseMinutes).toBe(60);
    expect(body.data.pregnancy.gestationalAgeWeeks).toBeGreaterThanOrEqual(0);

    threadPublicId = body.data.publicId;
  });

  it("2. Validasi input: Ibu ditolak bila mengirim pesan teks kosong", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/mother/consultation/messages",
      headers: { authorization: `Bearer ${motherToken}` },
      payload: {
        messageType: "TEXT",
        body: "   ",
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
  });

  it("3. Ibu dapat mengirim pesan teks konsultasi ke bidan", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/mother/consultation/messages",
      headers: { authorization: `Bearer ${motherToken}` },
      payload: {
        messageType: "TEXT",
        body: "Halo Bidan, saya mau bertanya terkait keluhan pusing ringan di trimester 2.",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.senderRole).toBe("MOTHER");
    expect(body.data.messageType).toBe("TEXT");
    expect(body.data.body).toContain("keluhan pusing");
    expect(body.data.readAt).toBeNull();
  });

  it("4. Ibu dapat mengirim pesan foto dengan media attachment (JPEG)", async () => {
    // 1x1 transparent PNG / test image in base64
    const testImageBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const res = await app.inject({
      method: "POST",
      url: "/api/mother/consultation/messages",
      headers: { authorization: `Bearer ${motherToken}` },
      payload: {
        messageType: "IMAGE",
        body: "Foto ruam di lengan",
        attachment: {
          originalFilename: "ruam_lengan.jpg",
          mimeType: "image/jpeg",
          fileData: testImageBase64,
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.messageType).toBe("IMAGE");
    expect(body.data.attachments).toHaveLength(1);
    expect(body.data.attachments[0].originalFilename).toBe("ruam_lengan.jpg");
    expect(body.data.attachments[0].downloadUrl).toContain("/file");

    photoAttachmentPublicId = body.data.attachments[0].publicId;
  });

  it("5. Ibu dapat mengirim rekaman suara (voice note m4a)", async () => {
    const testAudioBase64 = "AAAAIGZ0eXBtcDQyAAAAAW1wNDJtcDQxaXNvbWF2YzE=";

    const res = await app.inject({
      method: "POST",
      url: "/api/mother/consultation/messages",
      headers: { authorization: `Bearer ${motherToken}` },
      payload: {
        messageType: "VOICE",
        attachment: {
          originalFilename: "vn_keluhan.m4a",
          mimeType: "audio/m4a",
          fileData: testAudioBase64,
          durationSeconds: 14,
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.messageType).toBe("VOICE");
    expect(body.data.attachments).toHaveLength(1);
    expect(body.data.attachments[0].durationSeconds).toBe(14);
  });

  it("6. Ibu dapat mengambil riwayat pesan konsultasi", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/consultation/messages",
      headers: { authorization: `Bearer ${motherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeGreaterThanOrEqual(3);
    expect(body.data.total).toBeGreaterThanOrEqual(3);
  });

  it("7. Bidan pendamping dapat melihat daftar konsultasi ibu binaan beserta jumlah pesan belum dibaca", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/midwife/consultations",
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    const currentThread = body.data.items.find(
      (th: { publicId: string }) => th.publicId === threadPublicId,
    );
    expect(currentThread).toBeDefined();
    expect(currentThread.unreadCount).toBeGreaterThanOrEqual(3);
  });

  it("8. Bidan dapat menandai pesan ibu sebagai telah dibaca (mark read)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/midwife/consultations/${threadPublicId}/read`,
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.markedCount).toBeGreaterThanOrEqual(3);

    // Verify unread count is now 0 for midwife
    const threadRes = await app.inject({
      method: "GET",
      url: `/api/midwife/consultations/${threadPublicId}`,
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
    });
    expect(threadRes.json().data.unreadCount).toBe(0);
  });

  it("9. Bidan dapat mengirim pesan balasan ke ibu binaan", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/midwife/consultations/${threadPublicId}/messages`,
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      payload: {
        messageType: "TEXT",
        body: "Halo Ibu, istirahat yang cukup, perbanyak konsumsi air putih dan sayuran hijau. Bila pusing berlanjut segera periksa ya.",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.senderRole).toBe("MIDWIFE");
    expect(body.data.readAt).toBeNull();
  });

  it("10. Ibu dapat menandai pesan balasan bidan sebagai telah dibaca", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/mother/consultation/read",
      headers: { authorization: `Bearer ${motherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.markedCount).toBeGreaterThanOrEqual(1);
  });

  it("11. Bidan dapat mengubah penanda perhatian administratif (NEEDS_ATTENTION)", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/midwife/consultations/${threadPublicId}/attention`,
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      payload: { attentionFlag: "NEEDS_ATTENTION" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.attentionFlag).toBe("NEEDS_ATTENTION");
  });

  it("12. Bidan dapat menutup thread konsultasi dan membukanya kembali", async () => {
    // Tutup
    const closeRes = await app.inject({
      method: "PATCH",
      url: `/api/midwife/consultations/${threadPublicId}/status`,
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      payload: { status: "CLOSED" },
    });
    expect(closeRes.statusCode).toBe(200);
    expect(closeRes.json().data.status).toBe("CLOSED");

    // Buka kembali
    const reopenRes = await app.inject({
      method: "PATCH",
      url: `/api/midwife/consultations/${threadPublicId}/status`,
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
      payload: { status: "OPEN" },
    });
    expect(reopenRes.statusCode).toBe(200);
    expect(reopenRes.json().data.status).toBe("OPEN");
  });

  it("13. Keamanan & Akses Media: Ibu dan Bidan yang berhak dapat mengunduh lampiran foto", async () => {
    expect(photoAttachmentPublicId).toBeDefined();

    // Ibu berhak
    const motherRes = await app.inject({
      method: "GET",
      url: `/api/consultation/attachments/${photoAttachmentPublicId}/file`,
      headers: { authorization: `Bearer ${motherToken}` },
    });
    expect(motherRes.statusCode).toBe(200);
    expect(motherRes.headers["content-type"]).toBe("image/jpeg");

    // Bidan pendamping berhak
    const midwifeRes = await app.inject({
      method: "GET",
      url: `/api/consultation/attachments/${photoAttachmentPublicId}/file`,
      headers: { authorization: `Bearer ${assignedMidwifeToken}` },
    });
    expect(midwifeRes.statusCode).toBe(200);
    expect(midwifeRes.headers["content-type"]).toBe("image/jpeg");
  });

  it("14. Keamanan & Anti-IDOR: Bidan lain yang tidak ditugaskan DITOLAK mengunduh lampiran (403)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/consultation/attachments/${photoAttachmentPublicId}/file`,
      headers: { authorization: `Bearer ${unassignedMidwifeToken}` },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.success).toBe(false);
  });

  it("15. Isolasi Admin: Admin DITOLAK membaca lampiran konsultasi privat medis (403)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/consultation/attachments/${photoAttachmentPublicId}/file`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("ADMIN_ACCESS_FORBIDDEN");
  });
});
