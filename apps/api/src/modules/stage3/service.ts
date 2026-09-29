import type { Prisma, PrismaClient } from "@prisma/client";
import {
  calculateAge,
  calculateEstimatedDueDate,
  calculateGestationalAge,
  formatDateOnly,
  trimesterFromWeeks,
} from "@pfram/validation";

export const expectedParentLevel = {
  PROVINCE: null,
  REGENCY: "PROVINCE",
  DISTRICT: "REGENCY",
  VILLAGE: "DISTRICT",
} as const;

export async function resolveRegionHierarchy(
  prisma: PrismaClient | Prisma.TransactionClient,
  ids: {
    provincePublicId: string;
    regencyPublicId: string;
    districtPublicId: string;
    villagePublicId?: string;
  },
) {
  const regions = await prisma.region.findMany({
    where: {
      publicId: {
        in: [
          ids.provincePublicId,
          ids.regencyPublicId,
          ids.districtPublicId,
          ids.villagePublicId,
        ].filter(Boolean) as string[],
      },
    },
  });
  const byPublic = new Map(regions.map((r) => [r.publicId, r]));
  const province = byPublic.get(ids.provincePublicId);
  const regency = byPublic.get(ids.regencyPublicId);
  const district = byPublic.get(ids.districtPublicId);
  const village = ids.villagePublicId
    ? byPublic.get(ids.villagePublicId)
    : undefined;
  if (
    !province ||
    province.level !== "PROVINCE" ||
    !regency ||
    regency.level !== "REGENCY" ||
    regency.parentId !== province.id ||
    !district ||
    district.level !== "DISTRICT" ||
    district.parentId !== regency.id ||
    (ids.villagePublicId &&
      (!village ||
        village.level !== "VILLAGE" ||
        village.parentId !== district.id))
  )
    throw Object.assign(new Error("Hierarki wilayah tidak konsisten"), {
      statusCode: 400,
      code: "REGION_HIERARCHY_INVALID",
    });
  if (
    [province, regency, district, village]
      .filter(Boolean)
      .some((r) => !r?.active)
  )
    throw Object.assign(new Error("Wilayah yang dipilih tidak aktif"), {
      statusCode: 409,
      code: "REGION_INACTIVE",
    });
  return { province, regency, district, village };
}

export async function profileCompletion(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
) {
  const profile = await prisma.motherProfile.findUnique({
    where: { userId },
    include: {
      primaryFacility: {
        select: { publicId: true, name: true, phoneNumber: true, active: true },
      },
      pregnancies: {
        where: { status: "ACTIVE" },
        take: 1,
        orderBy: { createdAt: "desc" },
        include: {
          assignments: {
            where: { status: "ACTIVE" },
            take: 1,
            include: {
              midwife: {
                select: {
                  publicId: true,
                  fullName: true,
                  whatsappNumber: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!profile)
    return {
      status: "ACCOUNT_READY" as const,
      profileCompleted: false,
      activePregnancy: null,
      selectedFacility: null,
      activeMidwifeAssignment: null,
    };
  const pregnancy = profile.pregnancies[0];
  const isFreshAccount = !profile.profileCompleted && !profile.dateOfBirth && !profile.address && !profile.provinceId;
  const status = isFreshAccount
    ? ("ACCOUNT_READY" as const)
    : !profile.profileCompleted
      ? ("PERSONAL_PROFILE_INCOMPLETE" as const)
      : !profile.primaryFacility
        ? ("FACILITY_NOT_SELECTED" as const)
        : !pregnancy?.completedProfile
          ? ("PREGNANCY_PROFILE_INCOMPLETE" as const)
          : !pregnancy.assignments[0]
            ? ("MIDWIFE_NOT_ASSIGNED" as const)
            : ("COMPLETE" as const);
  return {
    status,
    profileCompleted: status === "COMPLETE",
    activePregnancy: pregnancy ? pregnancySummary(pregnancy) : null,
    selectedFacility: profile.primaryFacility,
    activeMidwifeAssignment: pregnancy?.assignments[0]
      ? {
          publicId: pregnancy.assignments[0].publicId,
          midwife: pregnancy.assignments[0].midwife,
          startedAt: pregnancy.assignments[0].startedAt.toISOString(),
        }
      : null,
  };
}

export function pregnancySummary(pregnancy: {
  publicId: string;
  lastMenstrualPeriod: Date | null;
  gestationalAgeSource: "LMP" | "HEALTH_WORKER_ASSESSMENT";
  assessmentDate: Date | null;
  initialGestationalAgeWeeks: number | null;
  initialGestationalAgeDays: number | null;
  estimatedDueDate: Date;
  status: string;
  pregnancyType: string;
  completedProfile: boolean;
}) {
  const reference =
    pregnancy.gestationalAgeSource === "LMP"
      ? pregnancy.lastMenstrualPeriod
      : pregnancy.assessmentDate;
  const age = reference
    ? calculateGestationalAge(
        reference,
        pregnancy.gestationalAgeSource === "LMP"
          ? 0
          : (pregnancy.initialGestationalAgeWeeks ?? 0),
        pregnancy.gestationalAgeSource === "LMP"
          ? 0
          : (pregnancy.initialGestationalAgeDays ?? 0),
      )
    : null;
  return {
    publicId: pregnancy.publicId,
    status: pregnancy.status,
    pregnancyType: pregnancy.pregnancyType,
    completedProfile: pregnancy.completedProfile,
    estimatedDueDate: formatDateOnly(pregnancy.estimatedDueDate),
    gestationalAge: age ? { weeks: age.weeks, days: age.days } : null,
    trimester: age ? trimesterFromWeeks(age.weeks) : null,
  };
}

export function motherListItem(mother: {
  publicId: string;
  fullName: string;
  dateOfBirth: Date | null;
  primaryFacility: { publicId: string; name: string } | null;
  pregnancies: Array<{
    publicId: string;
    lastMenstrualPeriod: Date | null;
    gestationalAgeSource: "LMP" | "HEALTH_WORKER_ASSESSMENT";
    assessmentDate: Date | null;
    initialGestationalAgeWeeks: number | null;
    initialGestationalAgeDays: number | null;
    estimatedDueDate: Date;
    status: string;
    pregnancyType: string;
    completedProfile: boolean;
  }>;
}) {
  return {
    publicId: mother.publicId,
    fullName: mother.fullName,
    age: mother.dateOfBirth ? calculateAge(mother.dateOfBirth) : null,
    facility: mother.primaryFacility,
    activePregnancy: mother.pregnancies[0]
      ? pregnancySummary(mother.pregnancies[0])
      : null,
  };
}

export const dueDateForAssessment = (
  assessmentDate: Date,
  weeks: number,
  days: number,
) =>
  calculateEstimatedDueDate(
    new Date(assessmentDate.getTime() - (weeks * 7 + days) * 86_400_000),
  );
