import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";
import { bootstrapConsentDocuments } from "../src/modules/auth/consent-bootstrap.js";

const env = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://mock:mock@127.0.0.1:1/mock",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  CORS_ORIGINS: "http://localhost:5173",
  COOKIE_SECURE: "false",
};

describe("Auth Consent & Mother Registration API Suite", () => {
  const activeConsentId = "11111111-1111-1111-1111-111111111111";

  it("POST /api/auth/register/mother menolak payload dengan consentDocumentIds kosong", async () => {
    const mockPrisma = {
      $disconnect: vi.fn().mockResolvedValue(undefined),
      consentDocument: {
        findMany: vi.fn(),
      },
    } as unknown as PrismaClient;

    const app = buildApp({ env, prisma: mockPrisma });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register/mother",
      payload: {
        fullName: "Ibu Rahmawati",
        phoneNumber: "081234567890",
        password: "PasswordKuat123!",
        passwordConfirmation: "PasswordKuat123!",
        consentDocumentIds: [],
        clientType: "web",
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    // Verifikasi pesan ramah pengguna, BUKAN "Array must contain at least 1 element(s)"
    const consentError =
      body.error.details?.fieldErrors?.consentDocumentIds?.[0];
    expect(consentError).toBe(
      "Silakan setujui dokumen persetujuan layanan untuk melanjutkan pendaftaran.",
    );
    expect(consentError).not.toContain(
      "Array must contain at least 1 element(s)",
    );

    await app.close();
  });

  it("POST /api/auth/register/mother menolak jika consentDocumentIds tidak aktif di database", async () => {
    const mockPrisma = {
      $disconnect: vi.fn().mockResolvedValue(undefined),
      consentDocument: {
        findMany: vi.fn().mockResolvedValue([]), // Dokumen tidak ditemukan / tidak aktif
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const app = buildApp({ env, prisma: mockPrisma });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register/mother",
      payload: {
        fullName: "Ibu Rahmawati",
        phoneNumber: "081234567890",
        password: "PasswordKuat123!",
        passwordConfirmation: "PasswordKuat123!",
        consentDocumentIds: [activeConsentId],
        clientType: "web",
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("CONSENT_INVALID");
    expect(body.error.message).toBe("Dokumen persetujuan tidak aktif");

    await app.close();
  });

  it("POST /api/auth/register/mother berhasil jika consent valid dan aktif serta persist UserConsent", async () => {
    const userId = "22222222-2222-2222-2222-222222222222";
    const userPublicId = "33333333-3333-3333-3333-333333333333";

    const mockPrisma = {
      $disconnect: vi.fn().mockResolvedValue(undefined),
      consentDocument: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: activeConsentId,
            documentType: "TERMS",
            version: "1.0",
            title: "Syarat Penggunaan PFRAM",
          },
        ]),
      },
      user: {
        create: vi.fn().mockResolvedValue({
          id: userId,
          publicId: userPublicId,
          phoneNumber: "6281234567890",
          passwordHash: "hashed",
          role: "MOTHER",
          status: "ACTIVE",
          phoneVerifiedAt: null,
          motherProfile: { fullName: "Ibu Rahmawati" },
          midwifeProfile: null,
          adminProfile: null,
        }),
      },
      refreshSession: {
        create: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      motherProfile: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaClient;

    const app = buildApp({ env, prisma: mockPrisma });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register/mother",
      payload: {
        fullName: "Ibu Rahmawati",
        phoneNumber: "081234567890",
        password: "PasswordKuat123!",
        passwordConfirmation: "PasswordKuat123!",
        consentDocumentIds: [activeConsentId],
        clientType: "web",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.role).toBe("MOTHER");
    expect(body.data.user.phoneNumber).toBe("6281234567890");

    // Pastikan user.create dipanggil dengan consents relations (UserConsent persisted)
    expect(
      mockPrisma.user.create as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phoneNumber: "6281234567890",
          role: "MOTHER",
          consents: {
            create: [{ documentId: activeConsentId }],
          },
        }),
      }),
    );

    await app.close();
  });

  it("GET /api/auth/consents adalah READ-ONLY dan TIDAK mengubah database saat tabel kosong", async () => {
    const createFn = vi.fn();
    const upsertFn = vi.fn();
    const updateFn = vi.fn();

    const mockPrisma = {
      $disconnect: vi.fn().mockResolvedValue(undefined),
      consentDocument: {
        findMany: vi.fn().mockResolvedValue([]), // Kosong di database
        create: createFn,
        upsert: upsertFn,
        update: updateFn,
      },
    } as unknown as PrismaClient;

    const app = buildApp({ env, prisma: mockPrisma });
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/api/auth/consents",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]); // Mengembalikan empty array kanonikal

    // Verifikasi bahwa TIDAK ADA penulisan database sama sekali pada GET
    expect(createFn).not.toHaveBeenCalled();
    expect(upsertFn).not.toHaveBeenCalled();
    expect(updateFn).not.toHaveBeenCalled();

    await app.close();
  });

  describe("Consent Bootstrap Logic", () => {
    it("membuat dokumen kanonikal PRIVACY_POLICY v1.0 dan TERMS v1.0 saat tabel kosong", async () => {
      const createdDocs: Array<{
        id: string;
        documentType: string;
        version: string;
        title: string;
        content: string;
        active: boolean;
        effectiveAt: Date;
      }> = [];
      const mockPrisma = {
        consentDocument: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockImplementation(({ data }) => {
            const item = { id: `uuid-${data.documentType}`, ...data };
            createdDocs.push(item);
            return Promise.resolve(item);
          }),
        },
      } as unknown as PrismaClient;

      const result = await bootstrapConsentDocuments(mockPrisma);

      expect(result.createdCount).toBe(2);
      expect(result.skippedCount).toBe(0);
      expect(mockPrisma.consentDocument.create).toHaveBeenCalledTimes(2);

      const privacy = createdDocs.find(
        (d) => d.documentType === "PRIVACY_POLICY",
      );
      expect(privacy).toBeDefined();
      expect(privacy?.version).toBe("1.0");
      expect(privacy?.active).toBe(true);

      const terms = createdDocs.find((d) => d.documentType === "TERMS");
      expect(terms).toBeDefined();
      expect(terms?.version).toBe("1.0");
      expect(terms?.active).toBe(true);
    });

    it("bersifat idempoten: eksekusi kedua tidak membuat duplikasi dan tidak memodifikasi baris yang ada", async () => {
      const existing = [
        {
          id: "doc-1",
          documentType: "PRIVACY_POLICY",
          version: "1.0",
          title: "Kebijakan Privasi PFRAM",
          active: true,
          effectiveAt: new Date("2026-01-01"),
        },
        {
          id: "doc-2",
          documentType: "TERMS",
          version: "1.0",
          title: "Syarat Penggunaan PFRAM",
          active: true,
          effectiveAt: new Date("2026-01-01"),
        },
      ];

      const createFn = vi.fn();
      const updateFn = vi.fn();
      const mockPrisma = {
        consentDocument: {
          findMany: vi.fn().mockImplementation(({ where }) => {
            return Promise.resolve(
              existing.filter((d) => d.documentType === where.documentType),
            );
          }),
          create: createFn,
          update: updateFn,
        },
      } as unknown as PrismaClient;

      const result = await bootstrapConsentDocuments(mockPrisma);

      expect(result.createdCount).toBe(0);
      expect(result.skippedCount).toBe(2);
      expect(createFn).not.toHaveBeenCalled();
      expect(updateFn).not.toHaveBeenCalled();
    });

    it("tidak mengaktifkan kembali (reactivate) dokumen versi historis yang sengaja di-nonaktifkan", async () => {
      const existing = [
        {
          id: "doc-historical-inactive",
          documentType: "PRIVACY_POLICY",
          version: "1.0",
          title: "Kebijakan Privasi PFRAM Lama",
          active: false, // Sengaja dinonaktifkan
          effectiveAt: new Date("2025-01-01"),
        },
      ];

      const createFn = vi.fn();
      const updateFn = vi.fn();
      const mockPrisma = {
        consentDocument: {
          findMany: vi.fn().mockImplementation(({ where }) => {
            if (where.documentType === "PRIVACY_POLICY")
              return Promise.resolve(existing);
            return Promise.resolve([]);
          }),
          create: createFn.mockImplementation(({ data }) =>
            Promise.resolve({ id: "doc-terms", ...data }),
          ),
          update: updateFn,
        },
      } as unknown as PrismaClient;

      const result = await bootstrapConsentDocuments(mockPrisma);

      // PRIVACY_POLICY v1.0 dilewati tanpa menyentuh active: false
      const privacyResult = result.details.find(
        (d) => d.documentType === "PRIVACY_POLICY",
      );
      expect(privacyResult?.action).toBe("SKIPPED");
      expect(privacyResult?.active).toBe(false);
      expect(updateFn).not.toHaveBeenCalled();
    });

    it("tidak menimpa versi kebijakan yang lebih baru jika sudah terdapat versi aktif", async () => {
      // Misalkan sudah ada v2.0 yang aktif di sistem, tetapi v1.0 belum ada
      const existing = [
        {
          id: "doc-v2-active",
          documentType: "PRIVACY_POLICY",
          version: "2.0",
          title: "Kebijakan Privasi PFRAM v2.0",
          active: true,
          effectiveAt: new Date("2027-01-01"),
        },
      ];

      let createdPrivacyActiveState: boolean | undefined;
      const mockPrisma = {
        consentDocument: {
          findMany: vi.fn().mockImplementation(({ where }) => {
            if (where.documentType === "PRIVACY_POLICY")
              return Promise.resolve(existing);
            return Promise.resolve([]);
          }),
          create: vi.fn().mockImplementation(({ data }) => {
            if (data.documentType === "PRIVACY_POLICY") {
              createdPrivacyActiveState = data.active;
            }
            return Promise.resolve({ id: `doc-${data.documentType}`, ...data });
          }),
        },
      } as unknown as PrismaClient;

      const result = await bootstrapConsentDocuments(mockPrisma);

      const privacyResult = result.details.find(
        (d) => d.documentType === "PRIVACY_POLICY",
      );
      expect(privacyResult?.action).toBe("CREATED");
      // Karena v2.0 sudah aktif, v1.0 dibuat sebagai NON-AKTIF agar tidak menimpa v2.0 yang aktif
      expect(createdPrivacyActiveState).toBe(false);
      expect(privacyResult?.active).toBe(false);
    });
  });
});
