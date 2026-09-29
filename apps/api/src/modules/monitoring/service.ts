import type { Prisma, PrismaClient, MonitoringSource, UserRole } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";

export interface MonitoringEntryRecord {
  id: string;
  publicId: string;
  motherId: string;
  pregnancyId: string;
  recordedAt: Date;
  source: MonitoringSource;
  weightKg: Decimal | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  notes: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  mother?: { publicId: string };
  pregnancy?: { publicId: string };
  createdBy?: {
    publicId: string;
    role: UserRole;
    motherProfile?: { fullName: string } | null;
    midwifeProfile?: { fullName: string } | null;
    adminProfile?: { fullName: string } | null;
  };
}

export function formatCreatorName(user?: {
  role: UserRole;
  motherProfile?: { fullName: string } | null;
  midwifeProfile?: { fullName: string } | null;
  adminProfile?: { fullName: string } | null;
}): string {
  if (!user) return "Pengguna PFRAM";
  return (
    user.motherProfile?.fullName ??
    user.midwifeProfile?.fullName ??
    user.adminProfile?.fullName ??
    (user.role === "MOTHER"
      ? "Ibu"
      : user.role === "MIDWIFE"
        ? "Bidan"
        : "Administrator")
  );
}

export function monitoringEntryView(entry: MonitoringEntryRecord) {
  return {
    publicId: entry.publicId,
    motherPublicId: entry.mother?.publicId ?? "",
    pregnancyPublicId: entry.pregnancy?.publicId ?? "",
    recordedAt: entry.recordedAt.toISOString(),
    source: entry.source,
    weightKg: entry.weightKg !== null ? Number(entry.weightKg) : null,
    systolicBp: entry.systolicBp,
    diastolicBp: entry.diastolicBp,
    notes: entry.notes,
    createdBy: {
      publicId: entry.createdBy?.publicId ?? "",
      role: entry.createdBy?.role ?? "MOTHER",
      displayName: formatCreatorName(entry.createdBy),
    },
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    archivedAt: entry.archivedAt?.toISOString() ?? null,
  };
}

export function monitoringListItemView(entry: MonitoringEntryRecord) {
  return {
    publicId: entry.publicId,
    recordedAt: entry.recordedAt.toISOString(),
    source: entry.source,
    weightKg: entry.weightKg !== null ? Number(entry.weightKg) : null,
    systolicBp: entry.systolicBp,
    diastolicBp: entry.diastolicBp,
    notes: entry.notes,
    createdByName: formatCreatorName(entry.createdBy),
    isArchived: !!entry.archivedAt,
  };
}

export function calculateMonitoringSummary(
  entries: Array<{
    weightKg: Decimal | null;
    systolicBp: number | null;
    diastolicBp: number | null;
    recordedAt: Date;
  }>,
  activePregnancyPublicId: string | null,
) {
  // Sort descending by recordedAt
  const sorted = [...entries].sort(
    (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
  );

  // Latest weight and previous weight
  const weightEntries = sorted.filter((e) => e.weightKg !== null);
  const latestWeightEntry = weightEntries[0] ?? null;
  const previousWeightEntry = weightEntries[1] ?? null;

  const latestWeight =
    latestWeightEntry && latestWeightEntry.weightKg !== null
      ? Number(latestWeightEntry.weightKg)
      : null;
  const previousWeight =
    previousWeightEntry && previousWeightEntry.weightKg !== null
      ? Number(previousWeightEntry.weightKg)
      : null;

  const weightChange =
    latestWeight !== null && previousWeight !== null
      ? Math.round((latestWeight - previousWeight) * 100) / 100
      : null;

  // Latest blood pressure
  const bpEntries = sorted.filter(
    (e) => e.systolicBp !== null && e.diastolicBp !== null,
  );
  const latestBpEntry = bpEntries[0] ?? null;

  const latestBloodPressure =
    latestBpEntry &&
    latestBpEntry.systolicBp !== null &&
    latestBpEntry.diastolicBp !== null
      ? {
          systolic: latestBpEntry.systolicBp,
          diastolic: latestBpEntry.diastolicBp,
        }
      : null;

  return {
    latestWeight,
    latestWeightRecordedAt: latestWeightEntry
      ? latestWeightEntry.recordedAt.toISOString()
      : null,
    latestBloodPressure,
    latestBloodPressureRecordedAt: latestBpEntry
      ? latestBpEntry.recordedAt.toISOString()
      : null,
    previousWeight,
    weightChange,
    totalEntries: entries.length,
    activePregnancyPublicId,
  };
}

export async function verifyActiveAssignment(
  prisma: PrismaClient | Prisma.TransactionClient,
  midwifeUserId: string,
  motherPublicId: string,
) {
  const midwife = await prisma.midwifeProfile.findUnique({
    where: { userId: midwifeUserId },
  });
  if (!midwife || !midwife.active) {
    throw Object.assign(new Error("Profil bidan tidak aktif atau tidak ditemukan"), {
      statusCode: 403,
      code: "MIDWIFE_INACTIVE",
    });
  }

  const mother = await prisma.motherProfile.findUnique({
    where: { publicId: motherPublicId },
    include: {
      pregnancies: {
        where: { status: "ACTIVE" },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!mother) {
    throw Object.assign(new Error("Data ibu tidak ditemukan"), {
      statusCode: 404,
      code: "MOTHER_NOT_FOUND",
    });
  }

  const activeAssignment = await prisma.motherMidwifeAssignment.findFirst({
    where: {
      midwifeId: midwife.id,
      motherId: mother.id,
      status: "ACTIVE",
    },
  });

  if (!activeAssignment) {
    throw Object.assign(
      new Error("Bidan tidak memiliki penugasan aktif untuk ibu ini"),
      {
        statusCode: 404,
        code: "MOTHER_NOT_ASSIGNED",
      },
    );
  }

  return { midwife, mother, activeAssignment };
}
