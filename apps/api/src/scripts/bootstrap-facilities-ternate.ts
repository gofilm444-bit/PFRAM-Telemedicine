import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export interface TernatePuskesmasDefinition {
  masterKey: string;
  name: string;
  type: "PUSKESMAS";
  districtCode: string;
  villageCode: string;
  address: string;
  isPerawatan?: boolean;
}

export const TERNATE_PUSKESMAS_LIST: TernatePuskesmasDefinition[] = [
  {
    masterKey: "TERNATE_PUSKESMAS_SULAMADAHA",
    name: "Puskesmas Sulamadaha",
    type: "PUSKESMAS",
    districtCode: "82.71.08", // Ternate Barat
    villageCode: "82.71.08.1004", // Sulamadaha
    address: "Jl. Batu Angus, Kelurahan Sulamadaha, Kecamatan Ternate Barat, Kota Ternate",
  },
  {
    masterKey: "TERNATE_PUSKESMAS_JAMBULA",
    name: "Puskesmas Jambula",
    type: "PUSKESMAS",
    districtCode: "82.71.01", // Pulau Ternate
    villageCode: "82.71.01.1001", // Jambula
    address: "Jl. Batu Angus, Kelurahan Jambula, Kecamatan Pulau Ternate, Kota Ternate",
  },
  {
    masterKey: "TERNATE_PUSKESMAS_GAMBESI",
    name: "Puskesmas Gambesi",
    type: "PUSKESMAS",
    districtCode: "82.71.02", // Kota Ternate Selatan
    villageCode: "82.71.02.1001", // Gedung berlokasi di Sasa
    address: "Jl. KH. Ahmad Dahlan, Kelurahan Sasa, Kecamatan Kota Ternate Selatan, Kota Ternate",
  },
  {
    masterKey: "TERNATE_PUSKESMAS_KALUMATA",
    name: "Puskesmas Kalumata",
    type: "PUSKESMAS",
    districtCode: "82.71.02", // Kota Ternate Selatan
    villageCode: "82.71.02.1004", // Kalumata
    address: "Jl. Sanro Pedro, Kelurahan Kalumata, Kecamatan Kota Ternate Selatan, Kota Ternate",
  },
  {
    masterKey: "TERNATE_PUSKESMAS_KOTA",
    name: "Puskesmas Kota",
    type: "PUSKESMAS",
    districtCode: "82.71.06", // Kota Ternate Tengah
    villageCode: "82.71.06.1001", // Takoma
    address: "Jl. Seruni, Kelurahan Takoma, Kecamatan Kota Ternate Tengah, Kota Ternate",
  },
  {
    masterKey: "TERNATE_PUSKESMAS_KALUMPANG",
    name: "Puskesmas Kalumpang",
    type: "PUSKESMAS",
    districtCode: "82.71.06", // Kota Ternate Tengah
    villageCode: "82.71.06.1010", // Kalumpang
    address: "Jl. Kaka Ade, Kelurahan Kalumpang, Kecamatan Kota Ternate Tengah, Kota Ternate",
  },
  {
    masterKey: "TERNATE_PUSKESMAS_SIKO",
    name: "Puskesmas Siko",
    type: "PUSKESMAS",
    districtCode: "82.71.03", // Kota Ternate Utara
    villageCode: "82.71.03.1012", // Sangaji
    address: "Jl. Pemuda, Kelurahan Sangaji, Kecamatan Kota Ternate Utara, Kota Ternate",
  },
  {
    masterKey: "TERNATE_PUSKESMAS_BAHARI_BERKESAN",
    name: "Puskesmas Bahari Berkesan",
    type: "PUSKESMAS",
    districtCode: "82.71.03", // Kota Ternate Utara
    villageCode: "82.71.03.1016", // Sango
    address: "Jl. Batu Angus, Kelurahan Sango, Kecamatan Kota Ternate Utara, Kota Ternate",
  },
  {
    masterKey: "TERNATE_PUSKESMAS_MAYAU",
    name: "Puskesmas Perawatan Mayau",
    type: "PUSKESMAS",
    districtCode: "82.71.05", // Pulau Batang Dua
    villageCode: "82.71.05.1001", // Mayau
    address: "Jalan Pengabdian No. 02, Kelurahan Mayau, Kecamatan Pulau Batang Dua, Kota Ternate",
    isPerawatan: true,
  },
  {
    masterKey: "TERNATE_PUSKESMAS_MOTI",
    name: "Puskesmas Perawatan Moti",
    type: "PUSKESMAS",
    districtCode: "82.71.04", // Moti
    villageCode: "82.71.04.1002", // Moti Kota
    address: "Jl. Pante Tusehe, Kelurahan Moti Kota, Kecamatan Moti, Kota Ternate",
    isPerawatan: true,
  },
  {
    masterKey: "TERNATE_PUSKESMAS_HIRI",
    name: "Puskesmas Perawatan Hiri",
    type: "PUSKESMAS",
    districtCode: "82.71.07", // Pulau Hiri
    villageCode: "82.71.07.1001", // Faudu
    address: "Jl. Sultan M. Dzen, Kelurahan Faudu, Kecamatan Pulau Hiri, Kota Ternate",
    isPerawatan: true,
  },
];

export async function bootstrapTernateFacilities(prisma: PrismaClient) {
  console.log("=== BOOTSTRAP FASILITAS KESEHATAN KOTA TERNATE ===");
  console.log("Target scope: Provinsi Maluku Utara (82) -> Kota Ternate (82.71)");
  console.log("Mode: CREATE-MISSING ONLY via Stable masterKey (Idempoten, tidak pernah menimpa koreksi Admin)\n");

  const province = await prisma.region.findFirst({
    where: { code: "82", level: "PROVINCE" },
  });
  if (!province) {
    throw new Error("Master wilayah Provinsi Maluku Utara (kode: 82) belum terdaftar.");
  }

  const regency = await prisma.region.findFirst({
    where: { code: "82.71", level: "REGENCY" },
  });
  if (!regency) {
    throw new Error("Master wilayah Kota Ternate (kode: 82.71) belum terdaftar.");
  }

  let createdCount = 0;
  let skippedCount = 0;
  let backfilledCount = 0;
  let pendingCount = 0;

  for (const item of TERNATE_PUSKESMAS_LIST) {
    // 1. PRIMARY LOOKUP: Berdasarkan stable immutable masterKey
    const existingByKey = await prisma.healthFacility.findUnique({
      where: { masterKey: item.masterKey },
    });

    if (existingByKey) {
      console.log(
        `[SKIPPED] ${existingByKey.name} (masterKey: ${item.masterKey}, publicId: ${existingByKey.publicId}, address: "${existingByKey.address}") sudah ada - tidak ditimpa demi menjaga koreksi Admin.`,
      );
      skippedCount++;
      continue;
    }

    // 2. SECONDARY LOOKUP (Adopsi/Backfill Satu Kali):
    // Cek apakah ada fasilitas lama tanpa masterKey di Kota Ternate yang cocok secara univalen (misal data hasil seed lama)
    const unkeyedCandidates = await prisma.healthFacility.findMany({
      where: {
        masterKey: null,
        regencyId: regency.id,
        name: { equals: item.name, mode: "insensitive" },
      },
    });

    if (unkeyedCandidates.length === 1 && unkeyedCandidates[0]) {
      const candidate = unkeyedCandidates[0];
      await prisma.healthFacility.update({
        where: { id: candidate.id },
        data: { masterKey: item.masterKey },
      });
      console.log(
        `[BACKFILLED] ${candidate.name} (publicId: ${candidate.publicId}, address: "${candidate.address}") berhasil diadopsi dan diberi masterKey: ${item.masterKey} tanpa merusak data koreksi Admin.`,
      );
      backfilledCount++;
      skippedCount++;
      continue;
    } else if (unkeyedCandidates.length > 1) {
      console.warn(
        `[CONFLICT] Ditemukan ${unkeyedCandidates.length} fasilitas bernama '${item.name}' tanpa masterKey di Kota Ternate. Tidak dapat mengadopsi secara otomatis untuk mencegah ambiguitas.`,
      );
      pendingCount++;
      continue;
    }

    // 3. Verifikasi ketersediaan master wilayah untuk fasilitas baru yang akan dibuat
    const district = await prisma.region.findFirst({
      where: { code: item.districtCode, level: "DISTRICT" },
    });
    const village = await prisma.region.findFirst({
      where: { code: item.villageCode, level: "VILLAGE" },
    });

    if (!district || !village) {
      console.log(
        `[PENDING / SOURCE MISSING] ${item.name} (${item.masterKey}): Wilayah Kemendagri belum lengkap (District: ${item.districtCode} ${district ? "OK" : "MISSING"}, Village: ${item.villageCode} ${village ? "OK" : "MISSING"})`,
      );
      pendingCount++;
      continue;
    }

    // 4. Buat fasilitas baru dengan immutable masterKey
    const openingHours = item.isPerawatan
      ? { label: "24 Jam Setiap Hari (UGD & Rawat Inap)" }
      : { label: "Senin-Sabtu 08.00-14.00 WIT" };

    const serviceInformation = item.isPerawatan
      ? "Puskesmas rawat inap dan pelayanan kesehatan maternal-neonatal tingkat primer."
      : "Puskesmas rawat jalan dan pelayanan kesehatan ibu dan anak.";

    const created = await prisma.healthFacility.create({
      data: {
        masterKey: item.masterKey,
        name: item.name,
        type: item.type,
        address: item.address,
        provinceId: province.id,
        regencyId: regency.id,
        districtId: district.id,
        villageId: village.id,
        openingHours,
        serviceInformation,
        active: true,
      },
    });

    console.log(
      `[CREATED] ${created.name} berhasil dibuat (masterKey: ${created.masterKey}, publicId: ${created.publicId}, Kecamatan: ${district.name}, Kelurahan: ${village.name}).`,
    );
    createdCount++;
  }

  console.log("\n=== RINGKASAN BOOTSTRAP FASILITAS ===");
  console.log(`Total daftar Puskesmas   : ${TERNATE_PUSKESMAS_LIST.length}`);
  console.log(`Dibuat baru ([CREATED])   : ${createdCount}`);
  console.log(`Diadopsi ([BACKFILLED])   : ${backfilledCount}`);
  console.log(`Dilewati ([SKIPPED])      : ${skippedCount}`);
  console.log(`Tertunda ([PENDING])      : ${pendingCount}`);

  return {
    total: TERNATE_PUSKESMAS_LIST.length,
    created: createdCount,
    backfilled: backfilledCount,
    skipped: skippedCount,
    pending: pendingCount,
  };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await bootstrapTernateFacilities(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && process.argv[1].endsWith("bootstrap-facilities-ternate.ts")) {
  main().catch((err) => {
    console.error("Gagal menjalankan bootstrap fasilitas Ternate:", err);
    process.exit(1);
  });
}
