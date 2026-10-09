import type { ZodError } from "zod";

/**
 * Extracts a clear, user-friendly Indonesian validation error message
 * from a ZodError instead of generic "Data tidak valid".
 */
export function formatZodErrorMessage(error: ZodError): string {
  const firstIssue = error.issues[0]?.message;
  if (firstIssue && firstIssue !== "Invalid input") {
    return firstIssue;
  }
  return "Periksa kembali data yang diisi pada formulir.";
}
