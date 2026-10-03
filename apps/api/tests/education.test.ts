import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

describe("Stage 7 — Education, Nutrition & Body Changes Suite", () => {
  let app: ReturnType<typeof buildApp>;
  let prisma: PrismaClient;

  let adminToken: string;
  let motherToken: string;
  let midwifeToken: string;

  let createdArticlePublicId: string;
  const testSlug = `uji-artikel-baru-${Date.now()}`;

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

    // Admin
    const admin = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628111111111" },
    });
    adminToken = app.jwt.sign({
      sub: admin.id,
      publicId: admin.publicId,
      role: "ADMIN",
    });

    // Mother
    const mother = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628133333333" },
    });
    motherToken = app.jwt.sign({
      sub: mother.id,
      publicId: mother.publicId,
      role: "MOTHER",
    });

    // Midwife
    const midwife = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628122222222" },
    });
    midwifeToken = app.jwt.sign({
      sub: midwife.id,
      publicId: midwife.publicId,
      role: "MIDWIFE",
    });
  });

  afterAll(async () => {
    // Cleanup any test article created
    if (createdArticlePublicId) {
      await prisma.educationArticle.deleteMany({
        where: { publicId: createdArticlePublicId },
      });
    }
    await app.close();
    await prisma.$disconnect();
  });

  // ==============================================================
  // 1. MOTHER EDUCATION API
  // ==============================================================

  it("1.1. Ibu dapat mengambil daftar artikel edukasi beserta rekomendasi trimester", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/education",
      headers: { authorization: `Bearer ${motherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.items).toBeInstanceOf(Array);
    expect(body.data.items.length).toBeGreaterThanOrEqual(12);
    expect(body.data.total).toBeGreaterThanOrEqual(12);
    // Mother dev pregnancy LMP was 2026-06-01 -> pregnant, so recommendation exists
    expect(body.data.trimesterRecommendation).toBeDefined();
  });

  it("1.2. Filter kategori dan trimester berfungsi akurat", async () => {
    // Category filter: NUTRITION
    const resNutr = await app.inject({
      method: "GET",
      url: "/api/mother/education?category=NUTRITION",
      headers: { authorization: `Bearer ${motherToken}` },
    });
    expect(resNutr.statusCode).toBe(200);
    const nutrBody = resNutr.json();
    expect(nutrBody.data.items.length).toBeGreaterThanOrEqual(2);
    for (const item of nutrBody.data.items) {
      expect(item.category).toBe("NUTRITION");
    }

    // Trimester filter: TRIMESTER_1
    const resT1 = await app.inject({
      method: "GET",
      url: "/api/mother/education?trimester=TRIMESTER_1",
      headers: { authorization: `Bearer ${motherToken}` },
    });
    expect(resT1.statusCode).toBe(200);
    const t1Body = resT1.json();
    expect(t1Body.data.items.length).toBeGreaterThanOrEqual(2);
    for (const item of t1Body.data.items) {
      expect(item.trimester).toBe("TRIMESTER_1");
    }
  });

  it("1.3. Pencarian kata kunci (search) mengembalikan artikel yang relevan", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/education?search=kelor",
      headers: { authorization: `Bearer ${motherToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(body.data.items[0].slug).toBe("makanan-lokal-kaya-gizi");
  });

  it("1.4. Ibu dapat mengambil daftar artikel unggulan (featured)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/education/featured",
      headers: { authorization: `Bearer ${motherToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    for (const item of body.data) {
      expect(item.featured).toBe(true);
    }
  });

  it("1.5. Ibu dapat membuka detail artikel berdasarkan slug", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/education/tablet-tambah-darah-ttd",
      headers: { authorization: `Bearer ${motherToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.slug).toBe("tablet-tambah-darah-ttd");
    expect(body.data.title).toContain("Tablet Tambah Darah");
    expect(body.data.sourceName).toBeDefined();
    expect(body.data.content).toContain("feses berwarna");
  });

  it("1.6. Slug tidak ditemukan mengembalikan status 404", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/education/slug-yang-tidak-ada-dalam-database",
      headers: { authorization: `Bearer ${motherToken}` },
    });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("ARTICLE_NOT_FOUND");
  });

  // ==============================================================
  // 2. AUTHORIZATION & ROLE ISOLATION
  // ==============================================================

  it("2.1. Bidan tidak dapat mengakses modul edukasi ibu", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/mother/education",
      headers: { authorization: `Bearer ${midwifeToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("2.2. Ibu tidak dapat mengakses modul admin edukasi", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/education",
      headers: { authorization: `Bearer ${motherToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  // ==============================================================
  // 3. ADMIN MANAGEMENT CRUD & AUDIT
  // ==============================================================

  it("3.1. Admin dapat membuat artikel baru dengan audit log", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/education",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        slug: testSlug,
        title: "Panduan Hidrasi Ibu Hamil di Wilayah Pesisir",
        summary: "Pentingnya mencukupi kebutuhan cairan dan elektrolit alami di daerah panas.",
        content: `## Pentingnya Hidrasi yang Cukup\n\nIbu hamil di daerah pesisir memerlukan asupan cairan 2,5 hingga 3 liter per hari.\n\nAir kelapa muda segar dapat menjadi alternatif sumber elektrolit alami.`,
        category: "NUTRITION",
        trimester: "ALL",
        featured: true,
        sourceName: "Dinas Kesehatan Provinsi Maluku & Buku KIA 2024",
        sourceReference: "Pedoman Kemenkes RI",
        published: true,
        sortOrder: 15,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.slug).toBe(testSlug);
    createdArticlePublicId = body.data.publicId;

    // Verify audit log
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: "EDUCATION_ARTICLE_CREATED",
        entityId: createdArticlePublicId,
      },
    });
    expect(auditLog).toBeDefined();
    expect(auditLog?.result).toBe("SUCCESS");
  });

  it("3.2. Admin ditolak bila membuat artikel dengan slug duplikat (409)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/education",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        slug: testSlug, // already exists
        title: "Judul Duplikat",
        summary: "Ringkasan duplikat pengujian slug.",
        content: "Konten artikel uji coba duplikasi slug.",
        category: "OTHER",
        sourceName: "Uji Duplikat",
      },
    });

    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("SLUG_ALREADY_EXISTS");
  });

  it("3.3. Admin dapat memperbarui artikel melalui PATCH", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/admin/education/${createdArticlePublicId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Panduan Hidrasi Ibu Hamil di Wilayah Pesisir (Revisi)",
        featured: false,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toContain("(Revisi)");
    expect(body.data.featured).toBe(false);

    // Verify audit log
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: "EDUCATION_ARTICLE_UPDATED",
        entityId: createdArticlePublicId,
      },
    });
    expect(auditLog).toBeDefined();
  });

  it("3.4. Admin dapat mengarsipkan artikel sehingga tidak muncul di daftar ibu", async () => {
    // Archive
    const archiveRes = await app.inject({
      method: "POST",
      url: `/api/admin/education/${createdArticlePublicId}/archive`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(archiveRes.statusCode).toBe(200);

    // Verify mother cannot find it by slug
    const motherDetailRes = await app.inject({
      method: "GET",
      url: `/api/mother/education/${testSlug}`,
      headers: { authorization: `Bearer ${motherToken}` },
    });
    expect(motherDetailRes.statusCode).toBe(404);
  });

  it("3.5. Validasi input: Format slug tidak valid ditolak (400)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/education",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        slug: "SLUG DENGAN SPASI & HURUF BESAR",
        title: "Judul Uji",
        summary: "Ringkasan uji validasi slug.",
        content: "Konten uji coba validasi input.",
        category: "OTHER",
        sourceName: "Sumber Uji",
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
