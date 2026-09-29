import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
export const newOpaqueToken = () => randomBytes(48).toString("base64url");
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const safeEqual = (a: string, b: string) => {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
};
const sensitiveAuditKey =
  /(password|token|cookie|authorization|secret|phone|address|disease|health|medical|note)/i;
function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > 3) return "[DIBATASI]";
  if (Array.isArray(value))
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !sensitiveAuditKey.test(key))
        .slice(0, 20)
        .map(([key, item]) => [key, sanitizeValue(item, depth + 1)]),
    );
  if (typeof value === "string") return value.slice(0, 200);
  return value;
}
export const sanitizeAuditMetadata = (value: Record<string, unknown>) =>
  sanitizeValue(value, 0) as Record<string, unknown>;
