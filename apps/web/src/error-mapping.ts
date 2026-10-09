import { PframApiError } from "@pfram/api-client";
import { ZodError } from "zod";

export interface MappedErrorResult {
  formError: string | null;
  fieldErrors: Record<string, string>;
  message: string;
}

/**
 * Sanitizes technical or internal error messages into clear, friendly Bahasa Indonesia.
 */
export function sanitizeErrorMessage(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();

  // Network / connection failures
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("aborted") ||
    lower.includes("connection refused")
  ) {
    return "Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.";
  }

  // Raw Database, ORM, Fastify, or SQL errors
  if (
    lower.includes("prisma") ||
    lower.includes("sql") ||
    lower.includes("postgres") ||
    lower.includes("p2001") ||
    lower.includes("p2025") ||
    lower.includes("no record was found") ||
    lower.includes("foreign key") ||
    lower.includes("unique constraint") ||
    lower.includes("fastify") ||
    lower.includes("internal server error") ||
    lower.includes("stack trace") ||
    lower.includes("invocation") ||
    /^[A-Z0-9_]+$/.test(rawMessage)
  ) {
    return "Data belum berhasil disimpan. Silakan coba kembali.";
  }

  // Zod default English strings
  if (
    lower.includes("string must contain") ||
    lower.includes("expected string, received") ||
    lower.includes("invalid input") ||
    lower.includes("required") ||
    lower.includes("invalid date")
  ) {
    return "Periksa kembali format isian formulir.";
  }

  return rawMessage;
}

/**
 * Maps any error (API error, Zod validation error, Network error, or generic Error)
 * into structured field errors and a single form-level banner error when appropriate.
 */
export function extractAndMapError(err: unknown): MappedErrorResult {
  const fieldErrors: Record<string, string> = {};
  let formError: string | null = null;

  // 1. ZodError (frontend validation)
  if (err instanceof ZodError) {
    for (const issue of err.issues) {
      const field = issue.path[0];
      if (field && !fieldErrors[String(field)]) {
        fieldErrors[String(field)] = issue.message;
      } else if (!formError) {
        formError = issue.message;
      }
    }
    if (!formError && Object.keys(fieldErrors).length > 0) {
      // If all errors are at field level, keep formError empty to let fields display their error
      formError = null;
    }
    const message = formError || Object.values(fieldErrors)[0] || "Periksa kembali data yang diisi.";
    return { formError, fieldErrors, message };
  }

  // 2. PframApiError (backend API contract)
  if (err instanceof PframApiError) {
    // Extract field-level errors if provided by the backend contract
    const rawFieldErrors =
      err.fieldErrors ??
      (err.details &&
      typeof err.details === "object" &&
      "fieldErrors" in err.details &&
      typeof (err.details as { fieldErrors: unknown }).fieldErrors === "object"
        ? (err.details as { fieldErrors: Record<string, string[]> }).fieldErrors
        : undefined);

    if (rawFieldErrors) {
      for (const [key, msgs] of Object.entries(rawFieldErrors)) {
        if (Array.isArray(msgs) && msgs.length > 0 && msgs[0]) {
          fieldErrors[key] = sanitizeErrorMessage(msgs[0]);
        }
      }
    }

    // Map by HTTP status code and error code
    if (err.status === 401) {
      formError = "Sesi Anda telah berakhir. Silakan masuk kembali.";
    } else if (err.status === 403) {
      formError = "Anda tidak memiliki akses untuk melakukan tindakan ini.";
    } else if (err.status === 429) {
      formError = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    } else if (err.status >= 500) {
      formError = "Data belum berhasil disimpan. Silakan coba kembali.";
    } else if (err.code === "REGION_INACTIVE") {
      formError = "Wilayah yang dipilih sedang tidak aktif.";
    } else if (err.code === "REGION_HIERARCHY_INVALID") {
      formError =
        "Hierarki wilayah yang dipilih tidak sesuai. Silakan periksa kembali provinsi, kabupaten, dan kecamatan.";
    } else if (err.status === 409) {
      formError =
        err.message && !err.message.includes("Error")
          ? sanitizeErrorMessage(err.message)
          : "Data tersebut sudah terdaftar.";
    } else {
      const sanitized = sanitizeErrorMessage(err.message);
      // If we have field-level errors and the message is generic, prefer letting field errors speak
      if (Object.keys(fieldErrors).length > 0) {
        formError = null;
      } else {
        formError =
          sanitized || "Periksa kembali data yang diisi pada formulir.";
      }
    }

    const message = formError || Object.values(fieldErrors)[0] || "Periksa kembali data yang diisi.";
    return { formError, fieldErrors, message };
  }

  // 3. Generic Error or Network failure
  if (err instanceof Error) {
    const sanitized = sanitizeErrorMessage(err.message);
    const message = sanitized || "Terjadi kesalahan. Silakan coba kembali.";
    return {
      formError: sanitized,
      fieldErrors: {},
      message,
    };
  }

  // 4. Unknown fallback
  const fallbackMsg = "Terjadi kesalahan. Silakan coba kembali.";
  return {
    formError: fallbackMsg,
    fieldErrors: {},
    message: fallbackMsg,
  };
}

/**
 * Returns a single user-friendly message for simple alert banners.
 */
export function toFriendlyFormError(
  err: unknown,
  fallback = "Terjadi kesalahan. Silakan coba kembali.",
): string {
  const { formError, fieldErrors } = extractAndMapError(err);
  if (formError) return formError;
  const firstFieldMsg = Object.values(fieldErrors)[0];
  if (firstFieldMsg) return firstFieldMsg;
  return fallback;
}
