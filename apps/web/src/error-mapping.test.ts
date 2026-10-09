import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import { PframApiError } from "@pfram/api-client";
import {
  extractAndMapError,
  sanitizeErrorMessage,
  toFriendlyFormError,
} from "./error-mapping";

describe("error-mapping", () => {
  describe("sanitizeErrorMessage", () => {
    it("converts network failures to friendly Indonesian message", () => {
      expect(sanitizeErrorMessage("Failed to fetch")).toBe(
        "Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.",
      );
      expect(sanitizeErrorMessage("NetworkError when attempting to fetch resource")).toBe(
        "Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.",
      );
    });

    it("masks technical Prisma and database errors", () => {
      expect(sanitizeErrorMessage("PrismaClientKnownRequestError: Unique constraint failed")).toBe(
        "Data belum berhasil disimpan. Silakan coba kembali.",
      );
      expect(sanitizeErrorMessage("INTERNAL_SERVER_ERROR")).toBe(
        "Data belum berhasil disimpan. Silakan coba kembali.",
      );
    });

    it("masks default English Zod error fragments", () => {
      expect(sanitizeErrorMessage("String must contain at least 5 character(s)")).toBe(
        "Periksa kembali format isian formulir.",
      );
    });

    it("preserves already friendly Indonesian messages", () => {
      const msg = "Alamat fasilitas kesehatan wajib diisi.";
      expect(sanitizeErrorMessage(msg)).toBe(msg);
    });
  });

  describe("extractAndMapError", () => {
    it("extracts field-level errors from ZodError", () => {
      const zodErr = new ZodError([
        {
          code: "too_small",
          minimum: 1,
          type: "string",
          inclusive: true,
          exact: false,
          message: "Alamat wajib diisi",
          path: ["address"],
        },
      ]);
      const res = extractAndMapError(zodErr);
      expect(res.fieldErrors.address).toBe("Alamat wajib diisi");
      expect(res.message).toBe("Alamat wajib diisi");
    });

    it("extracts fieldErrors from PframApiError response contract", () => {
      const apiErr = new PframApiError(
        "VALIDATION_ERROR",
        "Periksa kembali data yang diisi.",
        400,
        {
          fieldErrors: {
            address: ["Alamat wajib diisi."],
            phoneNumber: ["Nomor HP Indonesia tidak valid."],
          },
        },
      );
      const res = extractAndMapError(apiErr);
      expect(res.fieldErrors.address).toBe("Alamat wajib diisi.");
      expect(res.fieldErrors.phoneNumber).toBe("Nomor HP Indonesia tidak valid.");
    });

    it("handles 403 authorization error", () => {
      const authErr = new PframApiError("FORBIDDEN", "Forbidden", 403);
      const res = extractAndMapError(authErr);
      expect(res.formError).toBe("Anda tidak memiliki akses untuk melakukan tindakan ini.");
      expect(res.message).toBe("Anda tidak memiliki akses untuk melakukan tindakan ini.");
    });

    it("handles 429 rate limit error", () => {
      const rateErr = new PframApiError("TOO_MANY_REQUESTS", "Rate limited", 429);
      const res = extractAndMapError(rateErr);
      expect(res.formError).toBe("Terlalu banyak percobaan. Silakan tunggu beberapa saat.");
    });

    it("handles 500 server error safely", () => {
      const srvErr = new PframApiError("INTERNAL_ERROR", "DB exploded", 500);
      const res = extractAndMapError(srvErr);
      expect(res.formError).toBe("Data belum berhasil disimpan. Silakan coba kembali.");
    });

    it("maps REGION_HIERARCHY_INVALID code to friendly message", () => {
      const regionErr = new PframApiError(
        "REGION_HIERARCHY_INVALID",
        "Hierarchy invalid",
        400,
      );
      const res = extractAndMapError(regionErr);
      expect(res.formError).toContain("Hierarki wilayah");
    });
  });

  describe("toFriendlyFormError", () => {
    it("returns formError if present", () => {
      const err = new Error("Failed to fetch");
      expect(toFriendlyFormError(err)).toBe(
        "Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.",
      );
    });

    it("returns first field error if formError is null", () => {
      const zodErr = new ZodError([
        {
          code: "custom",
          message: "Nama lengkap wajib diisi",
          path: ["fullName"],
        },
      ]);
      expect(toFriendlyFormError(zodErr)).toBe("Nama lengkap wajib diisi");
    });
  });
});
