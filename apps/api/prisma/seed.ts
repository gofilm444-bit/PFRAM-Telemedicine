import "dotenv/config";
import { PrismaClient, type UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import { calculateEstimatedDueDate, parseDateOnly } from "@pfram/validation";

const prisma = new PrismaClient();
if (process.env.NODE_ENV === "production")
  throw new Error("Seed development tidak boleh dijalankan pada production");

const IDS = {
  province: "31000000-0000-4000-8000-000000000001",
  regency: "31000000-0000-4000-8000-000000000002",
  district: "31000000-0000-4000-8000-000000000003",
  village: "31000000-0000-4000-8000-000000000004",
  facility: "32000000-0000-4000-8000-000000000001",
  assignment: "33000000-0000-4000-8000-000000000001",
  monitoringWeight: "34000000-0000-4000-8000-000000000001",
  monitoringBp: "34000000-0000-4000-8000-000000000002",
  monitoringCombined: "34000000-0000-4000-8000-000000000003",
} as const;

async function upsertUser(
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

async function main() {
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
  const admin = await upsertUser(
    "ADMIN",
    process.env.ADMIN_PHONE ?? "628111111111",
    process.env.ADMIN_PASSWORD ?? "AdminDev123!",
    "Administrator Development",
  );
  const midwifeUser = await upsertUser(
    "MIDWIFE",
    process.env.MIDWIFE_PHONE ?? "628122222222",
    process.env.MIDWIFE_PASSWORD ?? "MidwifeDev123!",
    "Bidan Development",
  );
  const motherUser = await upsertUser(
    "MOTHER",
    process.env.MOTHER_PHONE ?? "628133333333",
    process.env.MOTHER_PASSWORD ?? "MotherDev123!",
    "Ibu Development",
  );

  const province = await prisma.region.upsert({
    where: { publicId: IDS.province },
    update: { active: true },
    create: {
      publicId: IDS.province,
      code: "DEV-91",
      name: "Provinsi Pilot Development",
      level: "PROVINCE",
    },
  });
  const regency = await prisma.region.upsert({
    where: { publicId: IDS.regency },
    update: { active: true, parentId: province.id },
    create: {
      publicId: IDS.regency,
      code: "DEV-9101",
      name: "Kabupaten Pilot Development",
      level: "REGENCY",
      parentId: province.id,
    },
  });
  const district = await prisma.region.upsert({
    where: { publicId: IDS.district },
    update: { active: true, parentId: regency.id },
    create: {
      publicId: IDS.district,
      code: "DEV-910101",
      name: "Kecamatan Pilot Development",
      level: "DISTRICT",
      parentId: regency.id,
    },
  });
  const village = await prisma.region.upsert({
    where: { publicId: IDS.village },
    update: { active: true, parentId: district.id },
    create: {
      publicId: IDS.village,
      code: "DEV-91010101",
      name: "Kelurahan Pilot Development",
      level: "VILLAGE",
      parentId: district.id,
    },
  });
  const facility = await prisma.healthFacility.upsert({
    where: { publicId: IDS.facility },
    update: {
      active: true,
      provinceId: province.id,
      regencyId: regency.id,
      districtId: district.id,
      villageId: village.id,
    },
    create: {
      publicId: IDS.facility,
      name: "Puskesmas Pilot PFRAM (Development)",
      type: "PUSKESMAS",
      address: "Alamat khusus data development PFRAM",
      provinceId: province.id,
      regencyId: regency.id,
      districtId: district.id,
      villageId: village.id,
      phoneNumber: "628199999999",
      whatsappNumber: "628199999999",
      openingHours: { label: "Senin-Jumat 08.00-15.00 WIT" },
      serviceInformation: "Data layanan development, mudah diganti.",
      active: true,
    },
  });
  const midwife = await prisma.midwifeProfile.update({
    where: { userId: midwifeUser.id },
    data: {
      preferredName: "Bidan Dev",
      whatsappNumber: midwifeUser.phoneNumber,
      professionalRegistrationNumber: "DEV-STR-001",
      position: "Bidan Development",
      serviceHours: { label: "Senin-Jumat 08.00-15.00 WIT" },
      primaryFacilityId: facility.id,
      active: true,
      profileCompleted: true,
    },
  });
  if (
    !(await prisma.midwifeFacilityAssignment.findFirst({
      where: { midwifeId: midwife.id, facilityId: facility.id, active: true },
    }))
  )
    await prisma.midwifeFacilityAssignment.create({
      data: { midwifeId: midwife.id, facilityId: facility.id, primary: true },
    });
  if (
    !(await prisma.midwifeRegionAssignment.findFirst({
      where: { midwifeId: midwife.id, regionId: district.id, active: true },
    }))
  )
    await prisma.midwifeRegionAssignment.create({
      data: { midwifeId: midwife.id, regionId: district.id },
    });

  const mother = await prisma.motherProfile.update({
    where: { userId: motherUser.id },
    data: {
      fullName: "Ibu Development",
      preferredName: "Ibu Dev",
      dateOfBirth: parseDateOnly("1995-05-15"),
      address: "Alamat khusus data development PFRAM",
      provinceId: province.id,
      regencyId: regency.id,
      districtId: district.id,
      villageId: village.id,
      primaryFacilityId: facility.id,
      familyContactName: "Kontak Keluarga Development",
      familyContactPhone: "628188888888",
      emergencyContactName: "Kontak Darurat Development",
      emergencyContactPhone: "628177777777",
      emergencyContactRelationship: "Keluarga",
      profileCompleted: true,
      completedAt: new Date(),
    },
  });
  const lmp = parseDateOnly("2026-06-01");
  let pregnancy = await prisma.pregnancy.findFirst({
    where: { motherId: mother.id, status: "ACTIVE" },
  });
  if (!pregnancy) {
    pregnancy = await prisma.pregnancy.findUnique({
      where: {
        motherId_pregnancyNumber: { motherId: mother.id, pregnancyNumber: 1 },
      },
    });
  }
  if (!pregnancy) {
    pregnancy = await prisma.pregnancy.create({
      data: {
        motherId: mother.id,
        pregnancyNumber: 1,
        lastMenstrualPeriod: lmp,
        estimatedDueDate: calculateEstimatedDueDate(lmp),
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
    where: { motherId: mother.id, pregnancyId: pregnancy.id, status: "ACTIVE" },
  });
  if (!activeAssignment && pregnancy.status === "ACTIVE") {
    await prisma.motherMidwifeAssignment.upsert({
      where: { publicId: IDS.assignment },
      update: {
        motherId: mother.id,
        pregnancyId: pregnancy.id,
        midwifeId: midwife.id,
        facilityId: facility.id,
        status: "ACTIVE",
        endedAt: null,
      },
      create: {
        publicId: IDS.assignment,
        motherId: mother.id,
        pregnancyId: pregnancy.id,
        midwifeId: midwife.id,
        facilityId: facility.id,
        assignedByUserId: admin.id,
        status: "ACTIVE",
        notes: "Penugasan data development",
      },
    });
  }
  await prisma.userConsent.upsert({
    where: {
      userId_documentId: { userId: motherUser.id, documentId: privacy.id },
    },
    update: {},
    create: { userId: motherUser.id, documentId: privacy.id },
  });
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
  await prisma.monitoringEntry.upsert({
    where: { publicId: IDS.monitoringWeight },
    update: {
      motherId: mother.id,
      pregnancyId: pregnancy.id,
      recordedAt: new Date("2026-08-01T08:00:00Z"),
      source: "SELF",
      weightKg: 56.5,
      systolicBp: null,
      diastolicBp: null,
      notes: "Catatan berat badan mandiri development",
      createdByUserId: motherUser.id,
      archivedAt: null,
    },
    create: {
      publicId: IDS.monitoringWeight,
      motherId: mother.id,
      pregnancyId: pregnancy.id,
      recordedAt: new Date("2026-08-01T08:00:00Z"),
      source: "SELF",
      weightKg: 56.5,
      notes: "Catatan berat badan mandiri development",
      createdByUserId: motherUser.id,
    },
  });

  await prisma.monitoringEntry.upsert({
    where: { publicId: IDS.monitoringBp },
    update: {
      motherId: mother.id,
      pregnancyId: pregnancy.id,
      recordedAt: new Date("2026-08-03T09:30:00Z"),
      source: "POSYANDU",
      weightKg: null,
      systolicBp: 115,
      diastolicBp: 75,
      notes: "Pemeriksaan tensi di Posyandu development",
      createdByUserId: midwifeUser.id,
      archivedAt: null,
    },
    create: {
      publicId: IDS.monitoringBp,
      motherId: mother.id,
      pregnancyId: pregnancy.id,
      recordedAt: new Date("2026-08-03T09:30:00Z"),
      source: "POSYANDU",
      systolicBp: 115,
      diastolicBp: 75,
      notes: "Pemeriksaan tensi di Posyandu development",
      createdByUserId: midwifeUser.id,
    },
  });

  await prisma.monitoringEntry.upsert({
    where: { publicId: IDS.monitoringCombined },
    update: {
      motherId: mother.id,
      pregnancyId: pregnancy.id,
      recordedAt: new Date("2026-08-05T10:15:00Z"),
      source: "PUSKESMAS",
      weightKg: 57.8,
      systolicBp: 118,
      diastolicBp: 78,
      notes: "Pemeriksaan rutin Puskesmas development",
      createdByUserId: midwifeUser.id,
      archivedAt: null,
    },
    create: {
      publicId: IDS.monitoringCombined,
      motherId: mother.id,
      pregnancyId: pregnancy.id,
      recordedAt: new Date("2026-08-05T10:15:00Z"),
      source: "PUSKESMAS",
      weightKg: 57.8,
      systolicBp: 118,
      diastolicBp: 78,
      notes: "Pemeriksaan rutin Puskesmas development",
      createdByUserId: midwifeUser.id,
    },
  });

  console.log(
    "Seed Tahap 4A development selesai. Kredensial tercantum di README.",
  );
}

main().finally(() => prisma.$disconnect());
