import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  BloodDonorItem,
  P4kChecklistItem,
  P4kChecklistPatchInput,
  P4kPlan,
  P4kPlanInput,
  ReferralPlan,
  ReferralPlanInput,
} from "@pfram/shared-types";
import { formatDateOnly } from "@pfram/validation";

export class P4kError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = "P4K_ERROR",
  ) {
    super(message);
  }
}

export const DEFAULT_CHECKLIST_ITEMS = [
  { itemKey: "IDENTITY_DOCS", title: "KTP & Kartu Keluarga", category: "DOCUMENTS", sortOrder: 1 },
  { itemKey: "BPJS_CARD", title: "Kartu JKN / BPJS Kesehatan Aktif", category: "DOCUMENTS", sortOrder: 2 },
  { itemKey: "KIA_BOOK", title: "Buku KIA (Kesehatan Ibu dan Anak)", category: "DOCUMENTS", sortOrder: 3 },
  { itemKey: "MOTHER_CLOTHES", title: "Pakaian Bersih Ibu (Kancing Depan & Kain/Sarung)", category: "CLOTHING", sortOrder: 4 },
  { itemKey: "BABY_CLOTHES", title: "Pakaian Bayi, Popok, Sarung Tangan & Selimut", category: "CLOTHING", sortOrder: 5 },
  { itemKey: "HYGIENE_KIT", title: "Perlengkapan Mandi & Pembalut Bersalin", category: "SUPPLIES", sortOrder: 6 },
  { itemKey: "BREASTFEEDING_KIT", title: "Perlengkapan Menyusui (Bra Menyusui & Kain Penutup)", category: "SUPPLIES", sortOrder: 7 },
  { itemKey: "MEDICINES", title: "Obat Pribadi / Vitamin Sesuai Anjuran Nakes", category: "MEDICINE", sortOrder: 8 },
  { itemKey: "OTHER_SUPPLIES", title: "Perlengkapan Tambahan Lainnya", category: "OTHER", sortOrder: 9 },
] as const;

export async function getActivePregnancyForMother(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherId: string,
) {
  const pregnancy = await prisma.pregnancy.findFirst({
    where: { motherId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!pregnancy) {
    throw new P4kError("Tidak ditemukan data kehamilan aktif untuk ibu ini", 404, "NO_ACTIVE_PREGNANCY");
  }
  return pregnancy;
}

export async function ensureP4kPlanWithDefaults(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherId: string,
  pregnancyId: string,
) {
  let plan = await prisma.p4kPlan.findUnique({
    where: { pregnancyId },
    include: {
      deliveryFacility: { select: { publicId: true, name: true } },
      checklistItems: { orderBy: { sortOrder: "asc" } },
      mother: {
        select: {
          publicId: true,
          fullName: true,
          familyContactName: true,
          familyContactPhone: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          primaryFacilityId: true,
          primaryFacility: { select: { publicId: true, name: true } },
        },
      },
      pregnancy: {
        select: {
          publicId: true,
          estimatedDueDate: true,
        },
      },
    },
  });

  if (!plan) {
    const mother = await prisma.motherProfile.findUniqueOrThrow({
      where: { id: motherId },
      include: {
        primaryFacility: { select: { id: true, publicId: true, name: true } },
      },
    });

    plan = await prisma.p4kPlan.create({
      data: {
        motherId,
        pregnancyId,
        deliveryFacilityId: mother.primaryFacilityId ?? null,
        deliveryAttendant: "BIDAN",
        birthCompanionName: mother.familyContactName ?? mother.emergencyContactName ?? null,
        birthCompanionPhone: mother.familyContactPhone ?? mother.emergencyContactPhone ?? null,
        transportation: "AMBULANS",
        fundingSource: "BPJS",
        emergencyContactName: mother.emergencyContactName ?? null,
        emergencyContactPhone: mother.emergencyContactPhone ?? null,
        bloodDonors: [],
        checklistItems: {
          create: DEFAULT_CHECKLIST_ITEMS.map((item) => ({
            itemKey: item.itemKey,
            title: item.title,
            category: item.category,
            sortOrder: item.sortOrder,
            checked: false,
          })),
        },
      },
      include: {
        deliveryFacility: { select: { publicId: true, name: true } },
        checklistItems: { orderBy: { sortOrder: "asc" } },
        mother: {
          select: {
            publicId: true,
            fullName: true,
            familyContactName: true,
            familyContactPhone: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            primaryFacilityId: true,
            primaryFacility: { select: { publicId: true, name: true } },
          },
        },
        pregnancy: {
          select: {
            publicId: true,
            estimatedDueDate: true,
          },
        },
      },
    });
  } else {
    // Ensure all default checklist items exist
    const existingKeys = new Set(plan.checklistItems.map((c) => c.itemKey));
    const missingItems = DEFAULT_CHECKLIST_ITEMS.filter((i) => !existingKeys.has(i.itemKey));

    const planId = plan.id;
    if (missingItems.length > 0) {
      await prisma.p4kChecklistItem.createMany({
        data: missingItems.map((item) => ({
          p4kPlanId: planId,
          itemKey: item.itemKey,
          title: item.title,
          category: item.category,
          sortOrder: item.sortOrder,
          checked: false,
        })),
      });

      // Refetch checklist items
      const updatedChecklist = await prisma.p4kChecklistItem.findMany({
        where: { p4kPlanId: planId },
        orderBy: { sortOrder: "asc" },
      });
      plan.checklistItems = updatedChecklist;
    }
  }

  return plan;
}

export function p4kPlanView(plan: {
  publicId: string;
  mother: { publicId: string };
  pregnancy: { publicId: string; estimatedDueDate: Date | null };
  deliveryFacility?: { publicId: string; name: string } | null;
  customDeliveryFacilityName?: string | null;
  deliveryAttendant: string;
  birthCompanionName?: string | null;
  birthCompanionPhone?: string | null;
  transportation?: string | null;
  fundingSource?: string | null;
  bpjsNumber?: string | null;
  bloodDonors?: Prisma.JsonValue;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  preparationNotes?: string | null;
  checklistItems?: Array<{
    publicId: string;
    itemKey: string;
    title: string;
    category: string;
    checked: boolean;
    checkedAt: Date | null;
    sortOrder: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}): P4kPlan {
  const items: P4kChecklistItem[] = (plan.checklistItems ?? []).map((c) => ({
    publicId: c.publicId,
    itemKey: c.itemKey,
    title: c.title,
    category: c.category,
    checked: c.checked,
    checkedAt: c.checkedAt?.toISOString() ?? null,
    sortOrder: c.sortOrder,
  }));

  const checkedCount = items.filter((c) => c.checked).length;
  const totalCount = items.length;
  const percentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const bloodDonors: BloodDonorItem[] = Array.isArray(plan.bloodDonors)
    ? (plan.bloodDonors as unknown as BloodDonorItem[])
    : [];

  return {
    publicId: plan.publicId,
    motherPublicId: plan.mother.publicId,
    pregnancyPublicId: plan.pregnancy.publicId,
    estimatedDueDate: plan.pregnancy.estimatedDueDate
      ? formatDateOnly(plan.pregnancy.estimatedDueDate)
      : null,
    deliveryFacility: plan.deliveryFacility
      ? {
          publicId: plan.deliveryFacility.publicId,
          name: plan.deliveryFacility.name,
        }
      : null,
    customDeliveryFacilityName: plan.customDeliveryFacilityName,
    deliveryAttendant: plan.deliveryAttendant,
    birthCompanionName: plan.birthCompanionName,
    birthCompanionPhone: plan.birthCompanionPhone,
    transportation: plan.transportation,
    fundingSource: plan.fundingSource,
    bpjsNumber: plan.bpjsNumber,
    bloodDonors,
    emergencyContactName: plan.emergencyContactName,
    emergencyContactPhone: plan.emergencyContactPhone,
    preparationNotes: plan.preparationNotes,
    checklistItems: items,
    checklistProgress: {
      total: totalCount,
      checked: checkedCount,
      percentage,
    },
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function updateP4kPlan(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherId: string,
  pregnancyId: string,
  input: P4kPlanInput,
) {
  const plan = await ensureP4kPlanWithDefaults(prisma, motherId, pregnancyId);

  let deliveryFacilityId: string | null | undefined = undefined;
  if (input.deliveryFacilityPublicId !== undefined) {
    if (input.deliveryFacilityPublicId === null) {
      deliveryFacilityId = null;
    } else {
      const facility = await prisma.healthFacility.findUnique({
        where: { publicId: input.deliveryFacilityPublicId },
      });
      if (!facility) {
        throw new P4kError("Fasilitas kesehatan tidak ditemukan", 404, "FACILITY_NOT_FOUND");
      }
      deliveryFacilityId = facility.id;
    }
  }

  const updated = await prisma.p4kPlan.update({
    where: { id: plan.id },
    data: {
      ...(deliveryFacilityId !== undefined ? { deliveryFacilityId } : {}),
      ...(input.customDeliveryFacilityName !== undefined ? { customDeliveryFacilityName: input.customDeliveryFacilityName } : {}),
      ...(input.deliveryAttendant !== undefined ? { deliveryAttendant: input.deliveryAttendant } : {}),
      ...(input.birthCompanionName !== undefined ? { birthCompanionName: input.birthCompanionName } : {}),
      ...(input.birthCompanionPhone !== undefined ? { birthCompanionPhone: input.birthCompanionPhone } : {}),
      ...(input.transportation !== undefined ? { transportation: input.transportation } : {}),
      ...(input.fundingSource !== undefined ? { fundingSource: input.fundingSource } : {}),
      ...(input.bpjsNumber !== undefined ? { bpjsNumber: input.bpjsNumber } : {}),
      ...(input.bloodDonors !== undefined ? { bloodDonors: input.bloodDonors as unknown as Prisma.InputJsonValue } : {}),
      ...(input.emergencyContactName !== undefined ? { emergencyContactName: input.emergencyContactName } : {}),
      ...(input.emergencyContactPhone !== undefined ? { emergencyContactPhone: input.emergencyContactPhone } : {}),
      ...(input.preparationNotes !== undefined ? { preparationNotes: input.preparationNotes } : {}),
    },
    include: {
      deliveryFacility: { select: { publicId: true, name: true } },
      checklistItems: { orderBy: { sortOrder: "asc" } },
      mother: { select: { publicId: true } },
      pregnancy: { select: { publicId: true, estimatedDueDate: true } },
    },
  });

  return p4kPlanView(updated);
}

export async function patchP4kChecklist(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherId: string,
  pregnancyId: string,
  input: P4kChecklistPatchInput,
) {
  const plan = await ensureP4kPlanWithDefaults(prisma, motherId, pregnancyId);

  const now = new Date();
  for (const item of input.items) {
    await prisma.p4kChecklistItem.updateMany({
      where: {
        p4kPlanId: plan.id,
        itemKey: item.itemKey,
      },
      data: {
        checked: item.checked,
        checkedAt: item.checked ? now : null,
      },
    });
  }

  const updatedChecklist = await prisma.p4kChecklistItem.findMany({
    where: { p4kPlanId: plan.id },
    orderBy: { sortOrder: "asc" },
  });

  const items: P4kChecklistItem[] = updatedChecklist.map((c) => ({
    publicId: c.publicId,
    itemKey: c.itemKey,
    title: c.title,
    category: c.category,
    checked: c.checked,
    checkedAt: c.checkedAt?.toISOString() ?? null,
    sortOrder: c.sortOrder,
  }));

  const checkedCount = items.filter((c) => c.checked).length;
  const totalCount = items.length;
  const percentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return {
    items,
    progress: {
      total: totalCount,
      checked: checkedCount,
      percentage,
    },
  };
}

export async function ensureReferralPlanWithDefaults(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherId: string,
  pregnancyId: string,
) {
  let plan = await prisma.referralPlan.findUnique({
    where: { pregnancyId },
    include: {
      sourceFacility: { select: { publicId: true, name: true } },
      destinationFacility: { select: { publicId: true, name: true } },
      mother: { select: { publicId: true, familyContactName: true, emergencyContactName: true, primaryFacilityId: true } },
      pregnancy: { select: { publicId: true } },
    },
  });

  if (!plan) {
    const mother = await prisma.motherProfile.findUniqueOrThrow({
      where: { id: motherId },
    });

    plan = await prisma.referralPlan.create({
      data: {
        motherId,
        pregnancyId,
        sourceFacilityId: mother.primaryFacilityId ?? null,
        transportType: "AMBULANCE",
        companions: mother.familyContactName ?? mother.emergencyContactName ?? null,
      },
      include: {
        sourceFacility: { select: { publicId: true, name: true } },
        destinationFacility: { select: { publicId: true, name: true } },
        mother: { select: { publicId: true, familyContactName: true, emergencyContactName: true, primaryFacilityId: true } },
        pregnancy: { select: { publicId: true } },
      },
    });
  }

  return plan;
}

export function referralPlanView(plan: {
  publicId: string;
  mother: { publicId: string };
  pregnancy: { publicId: string };
  sourceFacility?: { publicId: string; name: string } | null;
  customSourceFacilityName?: string | null;
  destinationFacility?: { publicId: string; name: string } | null;
  customDestinationFacilityName?: string | null;
  transportType: string;
  transportOperatorName?: string | null;
  transportContactNumber?: string | null;
  estimatedTravelTimeMinutes?: number | null;
  manualDepartureSchedule?: string | null;
  departurePoint?: string | null;
  companions?: string | null;
  rtkName?: string | null;
  rtkAddress?: string | null;
  rtkPhone?: string | null;
  alternativeNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ReferralPlan {
  return {
    publicId: plan.publicId,
    motherPublicId: plan.mother.publicId,
    pregnancyPublicId: plan.pregnancy.publicId,
    sourceFacility: plan.sourceFacility
      ? { publicId: plan.sourceFacility.publicId, name: plan.sourceFacility.name }
      : null,
    customSourceFacilityName: plan.customSourceFacilityName,
    destinationFacility: plan.destinationFacility
      ? { publicId: plan.destinationFacility.publicId, name: plan.destinationFacility.name }
      : null,
    customDestinationFacilityName: plan.customDestinationFacilityName,
    transportType: plan.transportType,
    transportOperatorName: plan.transportOperatorName,
    transportContactNumber: plan.transportContactNumber,
    estimatedTravelTimeMinutes: plan.estimatedTravelTimeMinutes,
    manualDepartureSchedule: plan.manualDepartureSchedule,
    departurePoint: plan.departurePoint,
    companions: plan.companions,
    rtkName: plan.rtkName,
    rtkAddress: plan.rtkAddress,
    rtkPhone: plan.rtkPhone,
    alternativeNotes: plan.alternativeNotes,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function updateReferralPlan(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherId: string,
  pregnancyId: string,
  input: ReferralPlanInput,
) {
  const plan = await ensureReferralPlanWithDefaults(prisma, motherId, pregnancyId);

  let sourceFacilityId: string | null | undefined = undefined;
  if (input.sourceFacilityPublicId !== undefined) {
    if (input.sourceFacilityPublicId === null) {
      sourceFacilityId = null;
    } else {
      const facility = await prisma.healthFacility.findUnique({
        where: { publicId: input.sourceFacilityPublicId },
      });
      if (!facility) {
        throw new P4kError("Fasilitas asal tidak ditemukan", 404, "SOURCE_FACILITY_NOT_FOUND");
      }
      sourceFacilityId = facility.id;
    }
  }

  let destinationFacilityId: string | null | undefined = undefined;
  if (input.destinationFacilityPublicId !== undefined) {
    if (input.destinationFacilityPublicId === null) {
      destinationFacilityId = null;
    } else {
      const facility = await prisma.healthFacility.findUnique({
        where: { publicId: input.destinationFacilityPublicId },
      });
      if (!facility) {
        throw new P4kError("Fasilitas tujuan tidak ditemukan", 404, "DESTINATION_FACILITY_NOT_FOUND");
      }
      destinationFacilityId = facility.id;
    }
  }

  const updated = await prisma.referralPlan.update({
    where: { id: plan.id },
    data: {
      ...(sourceFacilityId !== undefined ? { sourceFacilityId } : {}),
      ...(input.customSourceFacilityName !== undefined ? { customSourceFacilityName: input.customSourceFacilityName } : {}),
      ...(destinationFacilityId !== undefined ? { destinationFacilityId } : {}),
      ...(input.customDestinationFacilityName !== undefined ? { customDestinationFacilityName: input.customDestinationFacilityName } : {}),
      ...(input.transportType !== undefined ? { transportType: input.transportType } : {}),
      ...(input.transportOperatorName !== undefined ? { transportOperatorName: input.transportOperatorName } : {}),
      ...(input.transportContactNumber !== undefined ? { transportContactNumber: input.transportContactNumber } : {}),
      ...(input.estimatedTravelTimeMinutes !== undefined ? { estimatedTravelTimeMinutes: input.estimatedTravelTimeMinutes } : {}),
      ...(input.manualDepartureSchedule !== undefined ? { manualDepartureSchedule: input.manualDepartureSchedule } : {}),
      ...(input.departurePoint !== undefined ? { departurePoint: input.departurePoint } : {}),
      ...(input.companions !== undefined ? { companions: input.companions } : {}),
      ...(input.rtkName !== undefined ? { rtkName: input.rtkName } : {}),
      ...(input.rtkAddress !== undefined ? { rtkAddress: input.rtkAddress } : {}),
      ...(input.rtkPhone !== undefined ? { rtkPhone: input.rtkPhone } : {}),
      ...(input.alternativeNotes !== undefined ? { alternativeNotes: input.alternativeNotes } : {}),
    },
    include: {
      sourceFacility: { select: { publicId: true, name: true } },
      destinationFacility: { select: { publicId: true, name: true } },
      mother: { select: { publicId: true } },
      pregnancy: { select: { publicId: true } },
    },
  });

  return referralPlanView(updated);
}
