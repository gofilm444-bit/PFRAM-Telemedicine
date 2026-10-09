import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  bootstrapConsentDocuments,
  CANONICAL_CONSENT_DEFINITIONS,
} from "../modules/auth/consent-bootstrap.js";

async function main() {
  console.log("==================================================");
  console.log("PFRAM TELEMEDICINE — CANONICAL CONSENT BOOTSTRAP");
  console.log("==================================================");

  const prisma = new PrismaClient();
  try {
    const result = await bootstrapConsentDocuments(
      prisma,
      CANONICAL_CONSENT_DEFINITIONS,
    );

    for (const item of result.details) {
      const status = item.action === "CREATED" ? "[CREATED]" : "[SKIPPED]";
      console.log(
        `${status} ${item.documentType} v${item.version}: ${item.reason} (active: ${item.active ?? "N/A"})`,
      );
    }

    console.log("--------------------------------------------------");
    console.log(
      `Selesai. Dokumen dibuat: ${result.createdCount}, Dilewati (sudah ada): ${result.skippedCount}`,
    );
    console.log("==================================================");
  } catch (error) {
    console.error(
      "[FATAL ERROR] Gagal menjalankan bootstrap dokumen persetujuan:",
      error,
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
