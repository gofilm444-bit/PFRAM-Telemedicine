import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";
import {
  importMalukuUtaraRegions,
  loadMalukuUtaraDataset,
  validateRegionHierarchy,
} from "../src/modules/regions/importer.js";
import { assertTestDatabaseSafety } from "./setup.js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

describe("Provinsi Maluku Utara — Real Region Master & Database Isolation", () => {
  let app: ReturnType<typeof buildApp>;
  let prisma: PrismaClient;
  let devPrisma: PrismaClient | null = null;
  let adminToken: string;
  let userToken: string;

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

    // Pastikan master data wilayah terimpor di database test
    await importMalukuUtaraRegions(prisma);

    const admin = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628111111111" },
    });
    adminToken = app.jwt.sign({
      sub: admin.id,
      publicId: admin.publicId,
      role: "ADMIN",
    });

    const midwife = await prisma.user.findUniqueOrThrow({
      where: { phoneNumber: "628122222222" },
    });
    userToken = app.jwt.sign({
      sub: midwife.id,
      publicId: midwife.publicId,
      role: "MIDWIFE",
    });

    // Client untuk memeriksa keamanan dev database (read-only verification)
    const devUrl =
      process.env.DEV_DATABASE_URL ||
      "postgresql://pfram:pfram_dev_only@localhost:5433/pfram_db?schema=public";
    devPrisma = new PrismaClient({
      datasources: { db: { url: devUrl } },
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
    if (devPrisma) await devPrisma.$disconnect();
  });

  describe("1. Authoritative Dataset Verification", () => {
    it("memuat dataset resmi Maluku Utara dengan jumlah hierarki yang tepat", () => {
      const dataset = loadMalukuUtaraDataset();
      expect(dataset.length).toBe(1314);

      const provinces = dataset.filter((d) => d.level === "PROVINCE");
      const regencies = dataset.filter((d) => d.level === "REGENCY");
      const districts = dataset.filter((d) => d.level === "DISTRICT");
      const villages = dataset.filter((d) => d.level === "VILLAGE");

      expect(provinces.length).toBe(1);
      expect(regencies.length).toBe(10);
      expect(districts.length).toBe(118);
      expect(villages.length).toBe(1185);

      expect(provinces[0]?.code).toBe("82");
      expect(provinces[0]?.name).toBe("Maluku Utara");
    });

    it("memvalidasi integritas hierarki tanpa siklus dan tanpa parent yang hilang", () => {
      const dataset = loadMalukuUtaraDataset();
      expect(() => validateRegionHierarchy(dataset)).not.toThrow();
    });

    it("menolak dataset tidak valid jika terdapat kode duplikat atau parent hilang", () => {
      const invalidDuplicate = [
        { code: "82", name: "Provinsi 1", level: "PROVINCE" as const, parentCode: null },
        { code: "82", name: "Provinsi 2", level: "PROVINCE" as const, parentCode: null },
      ];
      expect(() => validateRegionHierarchy(invalidDuplicate)).toThrow(
        /Kode wilayah duplikat ditemukan/
      );

      const invalidParent = [
        {
          code: "82.01",
          name: "Kabupaten X",
          level: "REGENCY" as const,
          parentCode: "99.99",
        },
      ];
      expect(() => validateRegionHierarchy(invalidParent)).toThrow(
        /Parent dengan kode 99.99 tidak ditemukan/
      );
    });
  });

  describe("2. Idempotensi Import Master Wilayah", () => {
    it("impor ulang tidak menghasilkan duplikat dan tidak mengubah data yang sudah ada", async () => {
      const beforeCount = await prisma.region.count();
      expect(beforeCount).toBeGreaterThanOrEqual(1314);

      const result = await importMalukuUtaraRegions(prisma);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.unchanged).toBe(1314);

      const afterCount = await prisma.region.count();
      expect(afterCount).toBe(beforeCount);
    });
  });

  describe("3. Keunikan Kode Resmi dan Relasi Hierarki di Database", () => {
    it("setiap wilayah memiliki kode unik resmi dan parent terhubung secara benar", async () => {
      const ternateSelatan = await prisma.region.findFirstOrThrow({
        where: { code: "82.71.02" },
        include: {
          parent: {
            include: {
              parent: true,
            },
          },
          children: true,
        },
      });

      expect(ternateSelatan.name).toBe("Kota Ternate Selatan");
      expect(ternateSelatan.level).toBe("DISTRICT");

      // Parent DISTRICT harus REGENCY (Kota Ternate: 82.71)
      expect(ternateSelatan.parent).not.toBeNull();
      expect(ternateSelatan.parent?.code).toBe("82.71");
      expect(ternateSelatan.parent?.name).toBe("Kota Ternate");
      expect(ternateSelatan.parent?.level).toBe("REGENCY");

      // Grandparent harus PROVINCE (Maluku Utara: 82)
      expect(ternateSelatan.parent?.parent).not.toBeNull();
      expect(ternateSelatan.parent?.parent?.code).toBe("82");
      expect(ternateSelatan.parent?.parent?.name).toBe("Maluku Utara");
      expect(ternateSelatan.parent?.parent?.level).toBe("PROVINCE");

      // Children dari Ternate Selatan adalah kelurahan-kelurahan (termasuk Kalumata 82.71.02.1004)
      expect(ternateSelatan.children.length).toBeGreaterThanOrEqual(17);
      const kalumata = ternateSelatan.children.find((c) => c.code === "82.71.02.1004");
      expect(kalumata).toBeDefined();
      expect(kalumata?.name).toBe("Kalumata");
    });
  });

  describe("4. API Reference Endpoints & Cascading Dropdowns", () => {
    it("dapat mencari provinsi Maluku Utara melalui /api/reference/regions", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/reference/regions?level=PROVINCE",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.items.length).toBeGreaterThanOrEqual(1);
      const malut = body.data.items.find((item: { code: string }) => item.code === "82");
      expect(malut).toBeDefined();
      expect(malut.name).toBe("Maluku Utara");
      expect(malut.code).toBe("82");
    });

    it("dapat menavigasi anak wilayah secara berantai (children endpoint)", async () => {
      // 1. Ambil Provinsi Maluku Utara
      const provRes = await app.inject({
        method: "GET",
        url: "/api/reference/regions?code=82",
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(provRes.statusCode).toBe(200);
      const prov = provRes.json().data.items[0];

      // 2. Ambil Kabupaten/Kota dari Provinsi
      const regRes = await app.inject({
        method: "GET",
        url: `/api/reference/regions/${prov.publicId}/children`,
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(regRes.statusCode).toBe(200);
      const regList = regRes.json().data;
      expect(regList.length).toBe(10); // 10 Kabupaten/Kota

      // 3. Ambil Kota Ternate (82.71)
      const ternate = regList.find((r: { code: string }) => r.code === "82.71");
      expect(ternate).toBeDefined();

      // 4. Ambil Kecamatan di Kota Ternate
      const distRes = await app.inject({
        method: "GET",
        url: `/api/reference/regions/${ternate.publicId}/children`,
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(distRes.statusCode).toBe(200);
      const distList = distRes.json().data;
      expect(distList.length).toBeGreaterThanOrEqual(7);

      // 5. Ambil Kelurahan di Ternate Selatan (82.71.02)
      const south = distList.find((r: { code: string }) => r.code === "82.71.02");
      expect(south).toBeDefined();
      const vilRes = await app.inject({
        method: "GET",
        url: `/api/reference/regions/${south.publicId}/children`,
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(vilRes.statusCode).toBe(200);
      const vilList = vilRes.json().data;
      expect(vilList.length).toBeGreaterThanOrEqual(17);
      expect(vilList.some((v: { code: string; name: string }) => v.code === "82.71.02.1004" && v.name === "Kalumata")).toBe(true);
    });

    it("dapat mencari wilayah berdasarkan kode resmi atau nama (search filter)", async () => {
      // Pencarian dengan kode "82.71.02"
      const resCode = await app.inject({
        method: "GET",
        url: "/api/reference/regions?search=82.71.02",
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(resCode.statusCode).toBe(200);
      expect(resCode.json().data.items.some((i: { code: string }) => i.code === "82.71.02")).toBe(true);

      // Pencarian dengan nama "Kalumata"
      const resName = await app.inject({
        method: "GET",
        url: "/api/reference/regions?search=Kalumata",
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(resName.statusCode).toBe(200);
      expect(resName.json().data.items.some((i: { code: string }) => i.code === "82.71.02.1004")).toBe(true);
    });
  });

  describe("5. Admin Region Management & Validasi", () => {
    it("menolak pembuatan wilayah dengan kode duplikat yang sudah ada di database", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/regions",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Maluku Utara Duplikat",
          code: "82", // Duplikat kode provinsi
          level: "PROVINCE",
        },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("REGION_CODE_EXISTS");
    });

    it("menolak pembuatan wilayah non-provinsi tanpa parent", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/regions",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Kabupaten Tanpa Induk",
          code: "82.99",
          level: "REGENCY",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("REGION_PARENT_REQUIRED");
    });
  });

  describe("6. Integritas Data Demo terhadap Master Wilayah Riil", () => {
    it("fasilitas kanonikal development terhubung dengan wilayah riil Maluku Utara", async () => {
      const facilities = await prisma.healthFacility.findMany({
        where: {
          publicId: {
            in: [
              "32000000-0000-4000-8000-000000000001",
              "32000000-0000-4000-8000-000000000002",
              "32000000-0000-4000-8000-000000000003",
              "32000000-0000-4000-8000-000000000004",
            ],
          },
        },
        include: {
          province: true,
          regency: true,
          district: true,
          village: true,
        },
        orderBy: { publicId: "asc" },
      });

      expect(facilities.length).toBe(4);

      const f1 = facilities.find((f) => f.publicId === "32000000-0000-4000-8000-000000000001")!;
      expect(f1.name).toBe("Puskesmas Kalumata");
      expect(f1.province.code).toBe("82");
      expect(f1.regency.code).toBe("82.71");
      expect(f1.district.code).toBe("82.71.02");
      expect(f1.village?.code).toBe("82.71.02.1004");

      const f2 = facilities.find((f) => f.publicId === "32000000-0000-4000-8000-000000000002")!;
      expect(f2.name).toBe("Puskesmas Sasa");
      expect(f2.province.code).toBe("82");
      expect(f2.regency.code).toBe("82.71");
      expect(f2.district.code).toBe("82.71.02");
      expect(f2.village?.code).toBe("82.71.02.1001");

      const f3 = facilities.find((f) => f.publicId === "32000000-0000-4000-8000-000000000003")!;
      expect(f3.name).toBe("Posyandu Mawar Fitu");
      expect(f3.province.code).toBe("82");
      expect(f3.regency.code).toBe("82.71");
      expect(f3.district.code).toBe("82.71.02");
      expect(f3.village?.code).toBe("82.71.02.1003");

      const f4 = facilities.find((f) => f.publicId === "32000000-0000-4000-8000-000000000004")!;
      expect(f4.name).toBe("RSUD Dr. H. Chasan Boesoirie");
      expect(f4.province.code).toBe("82");
      expect(f4.regency.code).toBe("82.71");
      expect(f4.district.code).toBe("82.71.02");
      expect(f4.village?.code).toBe("82.71.02.1011");
    });

    it("profil ibu hamil terhubung dengan wilayah riil Maluku Utara", async () => {
      const mother = await prisma.user.findUniqueOrThrow({
        where: { phoneNumber: "628133333333" },
        include: {
          motherProfile: {
            include: {
              province: true,
              regency: true,
              district: true,
              village: true,
            },
          },
        },
      });

      const profile = mother.motherProfile!;
      expect(profile.province?.code).toBe("82");
      expect(profile.regency?.code).toBe("82.71");
      expect(profile.district?.code).toBe("82.71.02");
      if (profile.village) {
        expect(profile.village.code).toBe("82.71.02.1004");
      }
    });
  });

  describe("7. Isolasi Database Uji (Anti-Pollution Guard)", () => {
    it("pengujian berjalan di database terisolasi (pfram_test) dan tidak mencemari pfram_db", async () => {
      // 1. Verifikasi koneksi saat ini adalah pfram_test
      expect(testDbUrl).toContain("pfram_test");
      expect(testDbUrl).not.toContain("pfram_db");

      // 2. Verifikasi dev database tidak terpengaruh
      if (devPrisma) {
        const devRegionCount = await devPrisma.region.count();
        expect(devRegionCount).toBe(1314);

        const devUsersCount = await devPrisma.user.count();
        expect(devUsersCount).toBe(8);

        const devFacilityCount = await devPrisma.healthFacility.count();
        expect(devFacilityCount).toBe(4);
      }
    });
  });
});
