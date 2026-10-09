import type { PrismaClient } from "@prisma/client";

export interface CanonicalConsentDefinition {
  readonly documentType: "PRIVACY_POLICY" | "TERMS";
  readonly version: string;
  readonly title: string;
  readonly content: string;
}

export const CANONICAL_CONSENT_DEFINITIONS: readonly CanonicalConsentDefinition[] =
  [
    {
      documentType: "PRIVACY_POLICY",
      version: "1.0",
      title: "Kebijakan Privasi PFRAM",
      content:
        "Persetujuan pemrosesan data medis dan kebijakan privasi layanan telemedicine PFRAM. Data kesehatan ibu dan anak dilindungi sesuai standar kerahasiaan medis.",
    },
    {
      documentType: "TERMS",
      version: "1.0",
      title: "Syarat Penggunaan PFRAM",
      content:
        "Syarat dan ketentuan layanan telemedicine maternal & neonatal PFRAM. Layanan ini merupakan pendamping dan tidak menggantikan pemeriksaan langsung oleh tenaga kesehatan darurat.",
    },
  ] as const;

export interface BootstrapItemResult {
  documentType: string;
  version: string;
  action: "CREATED" | "SKIPPED";
  id?: string;
  active?: boolean;
  reason: string;
}

export interface BootstrapConsentSummary {
  createdCount: number;
  skippedCount: number;
  details: BootstrapItemResult[];
}

/**
 * Idempotently bootstraps canonical consent documents for PFRAM Telemedicine.
 *
 * Rules:
 * 1. If documentType with target version already exists in database:
 *    - DO NOT modify title, content, or timestamps.
 *    - DO NOT reactivate if it was intentionally deactivated (preserves historical inactive versions).
 *    - DO NOT duplicate rows.
 *    - SKIPPED.
 * 2. If target version does NOT exist, but ANY active version for that documentType already exists
 *    (e.g., a newer version 2.0 is active):
 *    - DO NOT activate v1.0 (creates as inactive historical archive, preserving the newer version as the sole active policy).
 * 3. If target version does NOT exist and NO active version exists for that documentType:
 *    - Creates target version with active: true.
 * 4. Existing UserConsent records are untouched (no mutations to UserConsent table).
 */
export async function bootstrapConsentDocuments(
  prisma: PrismaClient,
  definitions: readonly CanonicalConsentDefinition[] = CANONICAL_CONSENT_DEFINITIONS,
): Promise<BootstrapConsentSummary> {
  const details: BootstrapItemResult[] = [];
  let createdCount = 0;
  let skippedCount = 0;

  for (const def of definitions) {
    // 1. Fetch all existing documents for this documentType
    const existing = await prisma.consentDocument.findMany({
      where: { documentType: def.documentType },
      orderBy: { effectiveAt: "desc" },
    });

    // 2. Check if the exact version already exists
    const exactMatch = existing.find((d) => d.version === def.version);
    if (exactMatch) {
      details.push({
        documentType: def.documentType,
        version: def.version,
        action: "SKIPPED",
        id: exactMatch.id,
        active: exactMatch.active,
        reason: `Versi ${def.version} sudah ada (ID: ${exactMatch.id}, active: ${exactMatch.active}). Status dan riwayat tidak diubah.`,
      });
      skippedCount++;
      continue;
    }

    // 3. Version safety check: does an active version (or newer version) already exist?
    const hasActiveVersion = existing.some((d) => d.active);

    // If an active version already exists (e.g. v2.0), do not activate v1.0 to avoid replacing newer policies.
    const shouldBeActive = !hasActiveVersion;

    const created = await prisma.consentDocument.create({
      data: {
        documentType: def.documentType,
        version: def.version,
        title: def.title,
        content: def.content,
        active: shouldBeActive,
        effectiveAt: new Date(),
      },
    });

    details.push({
      documentType: created.documentType,
      version: created.version,
      action: "CREATED",
      id: created.id,
      active: created.active,
      reason: shouldBeActive
        ? `Dokumen kanonikal dibuat dan diaktifkan (belum ada versi aktif sebelumnya).`
        : `Dokumen dibuat dalam status non-aktif karena sudah terdapat versi aktif lain di sistem.`,
    });
    createdCount++;
  }

  return { createdCount, skippedCount, details };
}
