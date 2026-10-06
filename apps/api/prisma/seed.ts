import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { PrismaClient, type UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import { calculateEstimatedDueDate, parseDateOnly } from "@pfram/validation";
import { importMalukuUtaraRegions } from "../src/modules/regions/importer.js";

const IDS = {
  facility1: "32000000-0000-4000-8000-000000000001",
  facility2: "32000000-0000-4000-8000-000000000002",
  facility3: "32000000-0000-4000-8000-000000000003",
  facility4: "32000000-0000-4000-8000-000000000004",
  assignmentDev: "33000000-0000-4000-8000-000000000001",
  assignmentMother1: "33000000-0000-4000-8000-000000000002",
  assignmentMother2: "33000000-0000-4000-8000-000000000003",
  assignmentMother3: "33000000-0000-4000-8000-000000000004",
  monitoringWeight: "34000000-0000-4000-8000-000000000001",
  monitoringBp: "34000000-0000-4000-8000-000000000002",
  monitoringCombined: "34000000-0000-4000-8000-000000000003",
} as const;

async function upsertUser(
  prisma: PrismaClient,
  role: UserRole,
  phone: string,
  password: string,
  name: string,
) {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { phoneNumber: phone },
    update: { role, status: "ACTIVE" },
    create: { phoneNumber: phone, passwordHash, role, status: "ACTIVE" },
  });
  if (role === "ADMIN")
    await prisma.adminProfile.upsert({
      where: { userId: user.id },
      update: { fullName: name },
      create: { userId: user.id, fullName: name },
    });
  if (role === "MIDWIFE")
    await prisma.midwifeProfile.upsert({
      where: { userId: user.id },
      update: { fullName: name, phoneNumber: phone, active: true },
      create: { userId: user.id, fullName: name, phoneNumber: phone },
    });
  if (role === "MOTHER")
    await prisma.motherProfile.upsert({
      where: { userId: user.id },
      update: { fullName: name },
      create: { userId: user.id, fullName: name },
    });
  return user;
}

function resolvePassword(envKey: string, fallback: string): string {
  return process.env[envKey] || fallback;
}

function loadClinicalReferenceDataset() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(currentDir, "data/clinical-reference-data.json"),
    path.resolve(process.cwd(), "prisma/data/clinical-reference-data.json"),
    path.resolve(process.cwd(), "apps/api/prisma/data/clinical-reference-data.json"),
  ];
  const filePath = candidatePaths.find((p) => fs.existsSync(p));
  if (!filePath) {
    throw new Error(
      `Dataset clinical-reference-data.json tidak ditemukan. Lokasi diperiksa: ${candidatePaths.join(", ")}`
    );
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

async function seedClinicalReferenceData(prisma: PrismaClient) {
  const data = loadClinicalReferenceDataset();

  for (const set of data.ruleSets) {
    const upsertedSet = await prisma.dangerSignRuleSet.upsert({
      where: { version: set.version },
      update: {
        name: set.name,
        sourceReference: set.sourceReference,
        effectiveFrom: new Date(set.effectiveFrom),
        active: set.active,
      },
      create: {
        publicId: set.publicId,
        version: set.version,
        name: set.name,
        sourceReference: set.sourceReference,
        effectiveFrom: new Date(set.effectiveFrom),
        active: set.active,
      },
    });

    for (const rule of set.rules) {
      await prisma.dangerSignRule.upsert({
        where: {
          ruleSetId_code: {
            ruleSetId: upsertedSet.id,
            code: rule.code,
          },
        },
        update: {
          title: rule.title,
          description: rule.description,
          trimesterApplicability: rule.trimesterApplicability,
          question: rule.question,
          severityCategory: rule.severityCategory,
          sortOrder: rule.sortOrder,
          active: rule.active,
        },
        create: {
          publicId: rule.publicId,
          ruleSetId: upsertedSet.id,
          code: rule.code,
          title: rule.title,
          description: rule.description,
          trimesterApplicability: rule.trimesterApplicability,
          question: rule.question,
          severityCategory: rule.severityCategory,
          sortOrder: rule.sortOrder,
          active: rule.active,
        },
      });
    }
  }

  for (const art of data.articles) {
    await prisma.educationArticle.upsert({
      where: { slug: art.slug },
      update: {
        title: art.title,
        summary: art.summary,
        content: art.content,
        category: art.category,
        trimester: art.trimester,
        featured: art.featured,
        sourceName: art.sourceName,
        sourceReference: art.sourceReference,
        published: art.published,
        sortOrder: art.sortOrder,
        archivedAt: art.archivedAt ? new Date(art.archivedAt) : null,
      },
      create: {
        publicId: art.publicId,
        slug: art.slug,
        title: art.title,
        summary: art.summary,
        content: art.content,
        category: art.category,
        trimester: art.trimester,
        featured: art.featured,
        sourceName: art.sourceName,
        sourceReference: art.sourceReference,
        published: art.published,
        sortOrder: art.sortOrder,
        archivedAt: art.archivedAt ? new Date(art.archivedAt) : null,
      },
    });
  }
}

export async function cleanupLegacyDevRegions(
  prisma: PrismaClient,
  fallback: {
    provinceId: string;
    regencyId: string;
    districtId: string;
    villageId: string;
  },
) {
  // Find all legacy DEV-* regions
  const legacyRegions = await prisma.region.findMany({
    where: {
      OR: [
        { code: { startsWith: "DEV-" } },
        {
          publicId: {
            in: [
              "31000000-0000-4000-8000-000000000001",
              "31000000-0000-4000-8000-000000000002",
              "31000000-0000-4000-8000-000000000003",
              "31000000-0000-4000-8000-000000000004",
            ],
          },
        },
        { name: { contains: "Pilot Development" } },
      ],
    },
    select: { id: true, level: true },
  });

  if (legacyRegions.length === 0) return;

  const legacyIds = legacyRegions.map((r) => r.id);

  // 1. Rewire HealthFacility references
  await prisma.healthFacility.updateMany({
    where: { provinceId: { in: legacyIds } },
    data: { provinceId: fallback.provinceId },
  });
  await prisma.healthFacility.updateMany({
    where: { regencyId: { in: legacyIds } },
    data: { regencyId: fallback.regencyId },
  });
  await prisma.healthFacility.updateMany({
    where: { districtId: { in: legacyIds } },
    data: { districtId: fallback.districtId },
  });
  await prisma.healthFacility.updateMany({
    where: { villageId: { in: legacyIds } },
    data: { villageId: fallback.villageId },
  });

  // 2. Rewire MotherProfile references
  await prisma.motherProfile.updateMany({
    where: { provinceId: { in: legacyIds } },
    data: { provinceId: fallback.provinceId },
  });
  await prisma.motherProfile.updateMany({
    where: { regencyId: { in: legacyIds } },
    data: { regencyId: fallback.regencyId },
  });
  await prisma.motherProfile.updateMany({
    where: { districtId: { in: legacyIds } },
    data: { districtId: fallback.districtId },
  });
  await prisma.motherProfile.updateMany({
    where: { villageId: { in: legacyIds } },
    data: { villageId: fallback.villageId },
  });

  // 3. Remove legacy MidwifeRegionAssignment
  await prisma.midwifeRegionAssignment.deleteMany({
    where: { regionId: { in: legacyIds } },
  });

  // 4. Safely delete legacy regions from bottom level to top level
  for (const lvl of ["VILLAGE", "DISTRICT", "REGENCY", "PROVINCE"] as const) {
    await prisma.region.deleteMany({
      where: {
        id: { in: legacyIds },
        level: lvl,
      },
    });
  }

  // Any remaining matching legacy codes
  await prisma.region.deleteMany({
    where: {
      OR: [
        { code: { startsWith: "DEV-" } },
        { name: { contains: "Pilot Development" } },
      ],
    },
  });
}

export async function seedDevelopmentData(prisma: PrismaClient) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Seed development tidak boleh dijalankan pada production");

  console.log("Menjalankan impor master wilayah Maluku Utara...");
  const regionResult = await importMalukuUtaraRegions(prisma);
  console.log(
    `Impor wilayah selesai: ${regionResult.total} total wilayah, ` +
      `${regionResult.created} dibuat, ${regionResult.updated} diperbarui, ${regionResult.unchanged} tidak berubah.`
  );

  console.log("Menyemai data referensi klinis (tanda bahaya & artikel edukasi)...");
  await seedClinicalReferenceData(prisma);
  console.log("Penyemaian data referensi klinis selesai.");

  // Ambil referensi wilayah riil Maluku Utara
  const province = await prisma.region.findFirstOrThrow({
    where: { code: "82" },
  });
  const regency = await prisma.region.findFirstOrThrow({
    where: { code: "82.71" },
  });
  const districtSouth = await prisma.region.findFirstOrThrow({
    where: { code: "82.71.02" },
  });
  const villageKalumata = await prisma.region.findFirstOrThrow({
    where: { code: "82.71.02.1004" },
  });
  const villageSasa = await prisma.region.findFirstOrThrow({
    where: { code: "82.71.02.1001" },
  });
  const villageFitu = await prisma.region.findFirstOrThrow({
    where: { code: "82.71.02.1003" },
  });
  const villageTanahTinggi = await prisma.region.findFirstOrThrow({
    where: { code: "82.71.02.1011" },
  });

  // Bersihkan data wilayah uji legacy secara aman & rewire entitas terkait
  await cleanupLegacyDevRegions(prisma, {
    provinceId: province.id,
    regencyId: regency.id,
    districtId: districtSouth.id,
    villageId: villageKalumata.id,
  });

  const privacy = await prisma.consentDocument.upsert({
    where: {
      documentType_version: { documentType: "PRIVACY_POLICY", version: "1.0" },
    },
    update: { active: true },
    create: {
      documentType: "PRIVACY_POLICY",
      version: "1.0",
      title: "Kebijakan Privasi PFRAM",
      content:
        "Dokumen development. Tinjauan legal diperlukan sebelum produksi.",
      active: true,
      effectiveAt: new Date(),
    },
  });
  await prisma.consentDocument.upsert({
    where: { documentType_version: { documentType: "TERMS", version: "1.0" } },
    update: { active: true },
    create: {
      documentType: "TERMS",
      version: "1.0",
      title: "Syarat Penggunaan PFRAM",
      content:
        "Dokumen development. PFRAM tidak menggantikan tenaga kesehatan.",
      active: true,
      effectiveAt: new Date(),
    },
  });

  const adminPass = resolvePassword("ADMIN_PASSWORD", "AdminDev123!");
  const midwifePass = resolvePassword("MIDWIFE_PASSWORD", "MidwifeDev123!");
  const motherPass = resolvePassword("MOTHER_PASSWORD", "MotherDev123!");

  const admin = await upsertUser(
    prisma,
    "ADMIN",
    process.env.ADMIN_PHONE ?? "628111111111",
    adminPass,
    "Administrator Development",
  );

  const midwifeDev = await upsertUser(
    prisma,
    "MIDWIFE",
    process.env.MIDWIFE_PHONE ?? "628122222222",
    midwifePass,
    "Bidan Development",
  );

  const midwifeDemo2 = await upsertUser(
    prisma,
    "MIDWIFE",
    "6281200000002",
    midwifePass,
    "Bidan Demo 02 (Dewi Lestari, A.Md.Keb)",
  );

  const midwifeDemo3 = await upsertUser(
    prisma,
    "MIDWIFE",
    "6281200000003",
    midwifePass,
    "Bidan Demo 03 (Sri Handayani, S.Tr.Keb)",
  );

  const motherDev = await upsertUser(
    prisma,
    "MOTHER",
    process.env.MOTHER_PHONE ?? "628133333333",
    motherPass,
    "Ibu Development",
  );

  const motherDemo1 = await upsertUser(
    prisma,
    "MOTHER",
    "6281300000001",
    motherPass,
    "Ibu Demo 01 (Siti Aminah)",
  );

  const motherDemo2 = await upsertUser(
    prisma,
    "MOTHER",
    "6281300000002",
    motherPass,
    "Ibu Demo 02 (Fatimah Zahra)",
  );

  const motherDemo3 = await upsertUser(
    prisma,
    "MOTHER",
    "6281300000003",
    motherPass,
    "Ibu Demo 03 (Ratna Dewi)",
  );

  // Fasilitas Kesehatan Kanonikal
  const facility1 = await prisma.healthFacility.upsert({
    where: { publicId: IDS.facility1 },
    update: {
      name: "Puskesmas Kalumata",
      type: "PUSKESMAS",
      address: "Jl. Pertamina No. 12, Kalumata, Kota Ternate",
      provinceId: province.id,
      regencyId: regency.id,
      districtId: districtSouth.id,
      villageId: villageKalumata.id,
      phoneNumber: "628199999999",
      whatsappNumber: "628199999999",
      openingHours: { label: "Senin-Jumat 08.00-15.00 WIT" },
      serviceInformation: "Puskesmas rawat jalan dan pelayanan kesehatan ibu dan anak.",
      active: true,
    },
    create: {
      publicId: IDS.facility1,
      name: "Puskesmas Kalumata",
      type: "PUSKESMAS",
      address: "Jl. Pertamina No. 12, Kalumata, Kota Ternate",
      provinceId: province.id,
      regencyId: regency.id,
      districtId: districtSouth.id,
      villageId: villageKalumata.id,
      phoneNumber: "628199999999",
      whatsappNumber: "628199999999",
      openingHours: { label: "Senin-Jumat 08.00-15.00 WIT" },
      serviceInformation: "Puskesmas rawat jalan dan pelayanan kesehatan ibu dan anak.",
      active: true,
    },
  });

  const facility2 = await prisma.healthFacility.upsert({
    where: { publicId: IDS.facility2 },
    update: {
      name: "Puskesmas Sasa",
      type: "PUSKESMAS",
      address: "Jl. Raya Sasa No. 45, Sasa, Kota Ternate",
      provinceId: province.id,
      regencyId: regency.id,
      districtId: districtSouth.id,
      villageId: villageSasa.id,
      phoneNumber: "628199999998",
      whatsappNumber: "628199999998",
      openingHours: { label: "Senin-Sabtu 08.00-14.00 WIT" },
      serviceInformation: "Fasilitas layanan kesehatan primer ibu dan anak.",
      active: true,
    },
    create: {
      publicId: IDS.facility2,
      name: "Puskesmas Sasa",
      type: "PUSKESMAS",
      address: "Jl. Raya Sasa No. 45, Sasa, Kota Ternate",
      provinceId: province.id,
      regencyId: regency.id,
      districtId: districtSouth.id,
      villageId: villageSasa.id,
      phoneNumber: "62819999998",
      whatsappNumber: "62819999998",
      openingHours: { label: "Senin-Sabtu 08.00-14.00 WIT" },
      serviceInformation: "Fasilitas layanan kesehatan primer ibu dan anak.",
      active: true,
    },
  });

  const facility3 = await prisma.healthFacility.upsert({
    where: { publicId: IDS.facility3 },
    update: {
      name: "Posyandu Mawar Fitu",
      type: "CLINIC",
      address: "Jl. Pantai Fitu RT 02/01, Fitu, Kota Ternate",
      provinceId: province.id,
      regencyId: regency.id,
      districtId: districtSouth.id,
      villageId: villageFitu.id,
      phoneNumber: "628199999997",
      whatsappNumber: "628199999997",
      openingHours: { label: "Selasa & Kamis 08.30-12.00 WIT" },
      serviceInformation: "Posyandu pemantauan kehamilan dan gizi balita.",
      active: true,
    },
    create: {
      publicId: IDS.facility3,
      name: "Posyandu Mawar Fitu",
      type: "CLINIC",
      address: "Jl. Pantai Fitu RT 02/01, Fitu, Kota Ternate",
      provinceId: province.id,
      regencyId: regency.id,
      districtId: districtSouth.id,
      villageId: villageFitu.id,
      phoneNumber: "62819999997",
      whatsappNumber: "62819999997",
      openingHours: { label: "Selasa & Kamis 08.30-12.00 WIT" },
      serviceInformation: "Posyandu pemantauan kehamilan dan gizi balita.",
      active: true,
    },
  });

  await prisma.healthFacility.upsert({
    where: { publicId: IDS.facility4 },
    update: {
      name: "RSUD Dr. H. Chasan Boesoirie",
      type: "REFERRAL_FACILITY",
      address: "Jl. Cempaka No. 5, Tanah Tinggi, Kota Ternate",
      provinceId: province.id,
      regencyId: regency.id,
      districtId: districtSouth.id,
      villageId: villageTanahTinggi.id,
      phoneNumber: "62819999996",
      whatsappNumber: "62819999996",
      emergencyPhone: "119",
      openingHours: { label: "24 Jam Setiap Hari" },
      serviceInformation: "Rumah sakit rujukan utama obstetri dan ginekologi (PONEK) Provinsi Maluku Utara.",
      active: true,
    },
    create: {
      publicId: IDS.facility4,
      name: "RSUD Dr. H. Chasan Boesoirie",
      type: "REFERRAL_FACILITY",
      address: "Jl. Cempaka No. 5, Tanah Tinggi, Kota Ternate",
      provinceId: province.id,
      regencyId: regency.id,
      districtId: districtSouth.id,
      villageId: villageTanahTinggi.id,
      phoneNumber: "62819999996",
      whatsappNumber: "62819999996",
      emergencyPhone: "119",
      openingHours: { label: "24 Jam Setiap Hari" },
      serviceInformation: "Rumah sakit rujukan utama obstetri dan ginekologi (PONEK) Provinsi Maluku Utara.",
      active: true,
    },
  });

  // Profil & Penugasan Bidan
  const midwifeProfileDev = await prisma.midwifeProfile.update({
    where: { userId: midwifeDev.id },
    data: {
      fullName: "Bidan Development",
      preferredName: "Bidan Dev",
      whatsappNumber: midwifeDev.phoneNumber,
      professionalRegistrationNumber: "DEV-STR-001",
      position: "Bidan Koordinator",
      serviceHours: { label: "Senin-Jumat 08.00-15.00 WIT" },
      primaryFacilityId: facility1.id,
      active: true,
      profileCompleted: true,
    },
  });

  async function assignPrimaryFacility(midwifeId: string, facilityId: string) {
    const existingPrimary = await prisma.midwifeFacilityAssignment.findFirst({
      where: { midwifeId, active: true, primary: true },
    });
    if (existingPrimary) {
      if (existingPrimary.facilityId !== facilityId) {
        await prisma.midwifeFacilityAssignment.update({
          where: { id: existingPrimary.id },
          data: { facilityId },
        });
      }
    } else {
      await prisma.midwifeFacilityAssignment.create({
        data: { midwifeId, facilityId, primary: true, active: true },
      });
    }
  }

  async function assignRegion(midwifeId: string, regionId: string) {
    const existing = await prisma.midwifeRegionAssignment.findFirst({
      where: { midwifeId, regionId, active: true },
    });
    if (!existing) {
      await prisma.midwifeRegionAssignment.create({
        data: { midwifeId, regionId, active: true },
      });
    }
  }

  await assignPrimaryFacility(midwifeProfileDev.id, facility1.id);
  await assignRegion(midwifeProfileDev.id, districtSouth.id);

  const midwifeProfile2 = await prisma.midwifeProfile.update({
    where: { userId: midwifeDemo2.id },
    data: {
      fullName: "Bidan Demo 02 (Dewi Lestari, A.Md.Keb)",
      preferredName: "Bidan Dewi",
      whatsappNumber: midwifeDemo2.phoneNumber,
      professionalRegistrationNumber: "DEV-STR-002",
      position: "Bidan Desa",
      serviceHours: { label: "Senin-Sabtu 08.00-14.00 WIT" },
      primaryFacilityId: facility2.id,
      active: true,
      profileCompleted: true,
    },
  });
  await assignPrimaryFacility(midwifeProfile2.id, facility2.id);
  await assignRegion(midwifeProfile2.id, districtSouth.id);

  const midwifeProfile3 = await prisma.midwifeProfile.update({
    where: { userId: midwifeDemo3.id },
    data: {
      fullName: "Bidan Demo 03 (Sri Handayani, S.Tr.Keb)",
      preferredName: "Bidan Sri",
      whatsappNumber: midwifeDemo3.phoneNumber,
      professionalRegistrationNumber: "DEV-STR-003",
      position: "Bidan Pelaksana",
      serviceHours: { label: "Senin-Jumat 08.00-16.00 WIT" },
      primaryFacilityId: facility3.id,
      active: true,
      profileCompleted: true,
    },
  });
  await assignPrimaryFacility(midwifeProfile3.id, facility3.id);
  await assignRegion(midwifeProfile3.id, districtSouth.id);

  // Profil & Kehamilan Ibu Development
  const motherProfileDev = await prisma.motherProfile.update({
    where: { userId: motherDev.id },
    data: {
      fullName: "Ibu Development",
      preferredName: "Ibu Dev",
      dateOfBirth: parseDateOnly("1995-05-15"),
      address: "Jl. Pertamina Kalumata No. 12, Ternate Selatan",
      provinceId: province.id,
      regencyId: regency.id,
      districtId: districtSouth.id,
      villageId: villageKalumata.id,
      primaryFacilityId: facility1.id,
      familyContactName: "Kontak Keluarga Development",
      familyContactPhone: "628188888888",
      emergencyContactName: "Kontak Darurat Development",
      emergencyContactPhone: "628177777777",
      emergencyContactRelationship: "Keluarga",
      profileCompleted: true,
      completedAt: new Date(),
    },
  });

  const lmpDev = parseDateOnly("2026-06-01");
  let pregnancyDev = await prisma.pregnancy.findFirst({
    where: { motherId: motherProfileDev.id, status: "ACTIVE" },
  });
  if (!pregnancyDev) {
    pregnancyDev = await prisma.pregnancy.findUnique({
      where: {
        motherId_pregnancyNumber: { motherId: motherProfileDev.id, pregnancyNumber: 1 },
      },
    });
  }
  if (!pregnancyDev) {
    pregnancyDev = await prisma.pregnancy.create({
      data: {
        motherId: motherProfileDev.id,
        pregnancyNumber: 1,
        lastMenstrualPeriod: lmpDev,
        estimatedDueDate: calculateEstimatedDueDate(lmpDev),
        gestationalAgeSource: "LMP",
        pregnancyType: "SINGLETON",
        previousPregnancyCount: 0,
        previousDeliveryCount: 0,
        miscarriageCount: 0,
        completedProfile: true,
      },
    });
  }

  const activeAssignment = await prisma.motherMidwifeAssignment.findFirst({
    where: { motherId: motherProfileDev.id, pregnancyId: pregnancyDev.id, status: "ACTIVE" },
  });
  if (!activeAssignment && pregnancyDev.status === "ACTIVE") {
    await prisma.motherMidwifeAssignment.upsert({
      where: { publicId: IDS.assignmentDev },
      update: {
        motherId: motherProfileDev.id,
        pregnancyId: pregnancyDev.id,
        midwifeId: midwifeProfileDev.id,
        facilityId: facility1.id,
        status: "ACTIVE",
        endedAt: null,
      },
      create: {
        publicId: IDS.assignmentDev,
        motherId: motherProfileDev.id,
        pregnancyId: pregnancyDev.id,
        midwifeId: midwifeProfileDev.id,
        facilityId: facility1.id,
        assignedByUserId: admin.id,
        status: "ACTIVE",
        notes: "Penugasan data development",
      },
    });
  }

  // Profil Ibu Demo 1 (Trimester 1: ~8 minggu)
  const motherProfile1 = await prisma.motherProfile.update({
    where: { userId: motherDemo1.id },
    data: {
      fullName: "Ibu Demo 01 (Siti Aminah)",
      preferredName: "Ibu Siti",
      dateOfBirth: parseDateOnly("1998-03-20"),
      address: "Jl. Pertamina RT 04/02, Kalumata",
      provinceId: province.id,
      regencyId: regency.id,
      districtId: districtSouth.id,
      villageId: villageKalumata.id,
      primaryFacilityId: facility1.id,
      emergencyContactName: "Ahmad Dahlan",
      emergencyContactPhone: "6281700000001",
      emergencyContactRelationship: "Suami",
      profileCompleted: true,
      completedAt: new Date(),
    },
  });

  const lmpT1 = parseDateOnly("2026-08-08");
  let pregnancyT1 = await prisma.pregnancy.findFirst({
    where: { motherId: motherProfile1.id, status: "ACTIVE" },
  });
  if (!pregnancyT1) {
    pregnancyT1 = await prisma.pregnancy.create({
      data: {
        motherId: motherProfile1.id,
        pregnancyNumber: 1,
        lastMenstrualPeriod: lmpT1,
        estimatedDueDate: calculateEstimatedDueDate(lmpT1),
        gestationalAgeSource: "LMP",
        pregnancyType: "SINGLETON",
        completedProfile: true,
      },
    });
  }
  const assignmentMother1 = await prisma.motherMidwifeAssignment.findFirst({
    where: { motherId: motherProfile1.id, pregnancyId: pregnancyT1.id, status: "ACTIVE" },
  });
  if (!assignmentMother1) {
    await prisma.motherMidwifeAssignment.upsert({
      where: { publicId: IDS.assignmentMother1 },
      update: {
        motherId: motherProfile1.id,
        pregnancyId: pregnancyT1.id,
        midwifeId: midwifeProfileDev.id,
        facilityId: facility1.id,
        status: "ACTIVE",
        endedAt: null,
      },
      create: {
        publicId: IDS.assignmentMother1,
        motherId: motherProfile1.id,
        pregnancyId: pregnancyT1.id,
        midwifeId: midwifeProfileDev.id,
        facilityId: facility1.id,
        assignedByUserId: admin.id,
        status: "ACTIVE",
        notes: "Penugasan Bidan UAT T1",
      },
    });
  }

  // Profil Ibu Demo 2 (Trimester 2: ~20 minggu)
  const motherProfile2 = await prisma.motherProfile.update({
    where: { userId: motherDemo2.id },
    data: {
      fullName: "Ibu Demo 02 (Fatimah Zahra)",
      preferredName: "Ibu Fatimah",
      dateOfBirth: parseDateOnly("1996-07-11"),
      address: "Jl. Raya Sasa No. 10, Sasa",
      provinceId: province.id,
      regencyId: regency.id,
      districtId: districtSouth.id,
      villageId: villageSasa.id,
      primaryFacilityId: facility2.id,
      emergencyContactName: "Hasan Basri",
      emergencyContactPhone: "6281700000002",
      emergencyContactRelationship: "Suami",
      profileCompleted: true,
      completedAt: new Date(),
    },
  });

  const lmpT2 = parseDateOnly("2026-05-15");
  let pregnancyT2 = await prisma.pregnancy.findFirst({
    where: { motherId: motherProfile2.id, status: "ACTIVE" },
  });
  if (!pregnancyT2) {
    pregnancyT2 = await prisma.pregnancy.create({
      data: {
        motherId: motherProfile2.id,
        pregnancyNumber: 1,
        lastMenstrualPeriod: lmpT2,
        estimatedDueDate: calculateEstimatedDueDate(lmpT2),
        gestationalAgeSource: "LMP",
        pregnancyType: "SINGLETON",
        completedProfile: true,
      },
    });
  }
  const assignmentMother2 = await prisma.motherMidwifeAssignment.findFirst({
    where: { motherId: motherProfile2.id, pregnancyId: pregnancyT2.id, status: "ACTIVE" },
  });
  if (!assignmentMother2) {
    await prisma.motherMidwifeAssignment.upsert({
      where: { publicId: IDS.assignmentMother2 },
      update: {
        motherId: motherProfile2.id,
        pregnancyId: pregnancyT2.id,
        midwifeId: midwifeProfile2.id,
        facilityId: facility2.id,
        status: "ACTIVE",
        endedAt: null,
      },
      create: {
        publicId: IDS.assignmentMother2,
        motherId: motherProfile2.id,
        pregnancyId: pregnancyT2.id,
        midwifeId: midwifeProfile2.id,
        facilityId: facility2.id,
        assignedByUserId: admin.id,
        status: "ACTIVE",
        notes: "Penugasan Bidan UAT T2",
      },
    });
  }

  // Profil Ibu Demo 3 (Trimester 3: ~33 minggu)
  const motherProfile3 = await prisma.motherProfile.update({
    where: { userId: motherDemo3.id },
    data: {
      fullName: "Ibu Demo 03 (Ratna Dewi)",
      preferredName: "Ibu Ratna",
      dateOfBirth: parseDateOnly("1994-11-05"),
      address: "Jl. Pantai Fitu RT 01/01, Fitu",
      provinceId: province.id,
      regencyId: regency.id,
      districtId: districtSouth.id,
      villageId: villageFitu.id,
      primaryFacilityId: facility3.id,
      emergencyContactName: "Rudi Hartono",
      emergencyContactPhone: "6281700000003",
      emergencyContactRelationship: "Suami",
      profileCompleted: true,
      completedAt: new Date(),
    },
  });

  const lmpT3 = parseDateOnly("2026-02-12");
  let pregnancyT3 = await prisma.pregnancy.findFirst({
    where: { motherId: motherProfile3.id, status: "ACTIVE" },
  });
  if (!pregnancyT3) {
    pregnancyT3 = await prisma.pregnancy.create({
      data: {
        motherId: motherProfile3.id,
        pregnancyNumber: 1,
        lastMenstrualPeriod: lmpT3,
        estimatedDueDate: calculateEstimatedDueDate(lmpT3),
        gestationalAgeSource: "LMP",
        pregnancyType: "SINGLETON",
        completedProfile: true,
      },
    });
  }
  const assignmentMother3 = await prisma.motherMidwifeAssignment.findFirst({
    where: { motherId: motherProfile3.id, pregnancyId: pregnancyT3.id, status: "ACTIVE" },
  });
  if (!assignmentMother3) {
    await prisma.motherMidwifeAssignment.upsert({
      where: { publicId: IDS.assignmentMother3 },
      update: {
        motherId: motherProfile3.id,
        pregnancyId: pregnancyT3.id,
        midwifeId: midwifeProfile3.id,
        facilityId: facility3.id,
        status: "ACTIVE",
        endedAt: null,
      },
      create: {
        publicId: IDS.assignmentMother3,
        motherId: motherProfile3.id,
        pregnancyId: pregnancyT3.id,
        midwifeId: midwifeProfile3.id,
        facilityId: facility3.id,
        assignedByUserId: admin.id,
        status: "ACTIVE",
        notes: "Penugasan Bidan UAT T3",
      },
    });
  }

  // Consents & Settings
  for (const mUser of [motherDev, motherDemo1, motherDemo2, motherDemo3]) {
    await prisma.userConsent.upsert({
      where: {
        userId_documentId: { userId: mUser.id, documentId: privacy.id },
      },
      update: {},
      create: { userId: mUser.id, documentId: privacy.id },
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: "application.identity" },
    update: {
      value: {
        name: "PFRAM Telemedicine",
        tagline: "Pantau Kehamilan, Lindungi Ibu dan Bayi",
      },
    },
    create: {
      key: "application.identity",
      value: {
        name: "PFRAM Telemedicine",
        tagline: "Pantau Kehamilan, Lindungi Ibu dan Bayi",
      },
    },
  });

  // Entri Pemantauan Mandiri & Fasilitas untuk Ibu Dev
  await prisma.monitoringEntry.upsert({
    where: { publicId: IDS.monitoringWeight },
    update: {
      motherId: motherProfileDev.id,
      pregnancyId: pregnancyDev.id,
      recordedAt: new Date("2026-08-01T08:00:00Z"),
      source: "SELF",
      weightKg: 56.5,
      systolicBp: null,
      diastolicBp: null,
      notes: "Catatan berat badan mandiri development",
      createdByUserId: motherDev.id,
      archivedAt: null,
    },
    create: {
      publicId: IDS.monitoringWeight,
      motherId: motherProfileDev.id,
      pregnancyId: pregnancyDev.id,
      recordedAt: new Date("2026-08-01T08:00:00Z"),
      source: "SELF",
      weightKg: 56.5,
      notes: "Catatan berat badan mandiri development",
      createdByUserId: motherDev.id,
    },
  });

  await prisma.monitoringEntry.upsert({
    where: { publicId: IDS.monitoringBp },
    update: {
      motherId: motherProfileDev.id,
      pregnancyId: pregnancyDev.id,
      recordedAt: new Date("2026-08-03T09:30:00Z"),
      source: "POSYANDU",
      weightKg: null,
      systolicBp: 115,
      diastolicBp: 75,
      notes: "Pemeriksaan tensi di Posyandu development",
      createdByUserId: midwifeDev.id,
      archivedAt: null,
    },
    create: {
      publicId: IDS.monitoringBp,
      motherId: motherProfileDev.id,
      pregnancyId: pregnancyDev.id,
      recordedAt: new Date("2026-08-03T09:30:00Z"),
      source: "POSYANDU",
      systolicBp: 115,
      diastolicBp: 75,
      notes: "Pemeriksaan tensi di Posyandu development",
      createdByUserId: midwifeDev.id,
    },
  });

  await prisma.monitoringEntry.upsert({
    where: { publicId: IDS.monitoringCombined },
    update: {
      motherId: motherProfileDev.id,
      pregnancyId: pregnancyDev.id,
      recordedAt: new Date("2026-08-05T10:15:00Z"),
      source: "PUSKESMAS",
      weightKg: 57.8,
      systolicBp: 118,
      diastolicBp: 78,
      notes: "Pemeriksaan rutin Puskesmas development",
      createdByUserId: midwifeDev.id,
      archivedAt: null,
    },
    create: {
      publicId: IDS.monitoringCombined,
      motherId: motherProfileDev.id,
      pregnancyId: pregnancyDev.id,
      recordedAt: new Date("2026-08-05T10:15:00Z"),
      source: "PUSKESMAS",
      weightKg: 57.8,
      systolicBp: 118,
      diastolicBp: 78,
      notes: "Pemeriksaan rutin Puskesmas development",
      createdByUserId: midwifeDev.id,
    },
  });

  console.log(
    "Seed data development selesai. Kredensial dan data wilayah Maluku Utara siap digunakan.",
  );
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedDevelopmentData(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error("Gagal menjalankan seed development:", err);
    process.exit(1);
  });
}
