import type { PrismaClient } from "@prisma/client";
import type {
  AdherenceHistoryItem,
  AdherenceSummary,
  AncRuleSet,
  AncSchedule,
  AncVisitStatus,
  AncVisitType,
  Reminder,
  ReminderStatus,
  ReminderType,
  UserRole,
} from "@pfram/shared-types";

export class AncServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = "ANC_SERVICE_ERROR",
    public details?: unknown,
  ) {
    super(message);
  }
}

export const scheduleInclude = {
  mother: { select: { publicId: true } },
  pregnancy: { select: { publicId: true } },
  facility: { select: { publicId: true, name: true } },
  createdBy: {
    select: {
      publicId: true,
      role: true,
      motherProfile: { select: { fullName: true } },
      midwifeProfile: { select: { fullName: true } },
      adminProfile: { select: { fullName: true } },
    },
  },
} as const;

export const reminderInclude = {
  mother: { select: { publicId: true } },
  pregnancy: { select: { publicId: true } },
  ancSchedule: { select: { publicId: true } },
} as const;

export interface AncScheduleRecord {
  publicId: string;
  mother?: { publicId: string } | null;
  pregnancy?: { publicId: string } | null;
  facility?: { publicId: string; name: string } | null;
  scheduledAt: Date | string;
  visitType: string;
  doctorRequired?: boolean;
  status: string;
  notes?: string | null;
  completedAt?: Date | string | null;
  createdBy?: {
    publicId: string;
    role: string;
    midwifeProfile?: { fullName: string } | null;
    motherProfile?: { fullName: string } | null;
    adminProfile?: { fullName: string } | null;
  } | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  archivedAt?: Date | string | null;
}

export interface ReminderRecord {
  publicId: string;
  mother?: { publicId: string } | null;
  pregnancy?: { publicId: string } | null;
  ancSchedule?: { publicId: string } | null;
  type: string;
  scheduledAt: Date | string;
  reminderTime: string;
  status: string;
  snoozedUntil?: Date | string | null;
  snoozeCount?: number;
  completedAt?: Date | string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export function ancScheduleView(schedule: AncScheduleRecord): AncSchedule {
  return {
    publicId: schedule.publicId,
    motherPublicId: schedule.mother?.publicId ?? "",
    pregnancyPublicId: schedule.pregnancy?.publicId ?? "",
    facility: schedule.facility
      ? { publicId: schedule.facility.publicId, name: schedule.facility.name }
      : null,
    scheduledAt: schedule.scheduledAt instanceof Date
      ? schedule.scheduledAt.toISOString()
      : String(schedule.scheduledAt),
    visitType: schedule.visitType as AncVisitType,
    doctorRequired: Boolean(schedule.doctorRequired),
    status: schedule.status as AncVisitStatus,
    notes: schedule.notes ?? null,
    completedAt: schedule.completedAt
      ? schedule.completedAt instanceof Date
        ? schedule.completedAt.toISOString()
        : String(schedule.completedAt)
      : null,
    createdBy: schedule.createdBy
      ? {
          publicId: schedule.createdBy.publicId,
          role: schedule.createdBy.role as UserRole,
          name:
            schedule.createdBy.midwifeProfile?.fullName ??
            schedule.createdBy.motherProfile?.fullName ??
            schedule.createdBy.adminProfile?.fullName ??
            null,
        }
      : null,
    createdAt: schedule.createdAt instanceof Date
      ? schedule.createdAt.toISOString()
      : String(schedule.createdAt),
    updatedAt: schedule.updatedAt instanceof Date
      ? schedule.updatedAt.toISOString()
      : String(schedule.updatedAt),
    archivedAt: schedule.archivedAt
      ? schedule.archivedAt instanceof Date
        ? schedule.archivedAt.toISOString()
        : String(schedule.archivedAt)
      : null,
  };
}

export function reminderView(reminder: ReminderRecord): Reminder {
  return {
    publicId: reminder.publicId,
    motherPublicId: reminder.mother?.publicId ?? "",
    pregnancyPublicId: reminder.pregnancy?.publicId ?? null,
    ancSchedulePublicId: reminder.ancSchedule?.publicId ?? null,
    type: reminder.type as ReminderType,
    scheduledAt: reminder.scheduledAt instanceof Date
      ? reminder.scheduledAt.toISOString()
      : String(reminder.scheduledAt),
    reminderTime: reminder.reminderTime,
    status: reminder.status as ReminderStatus,
    snoozedUntil: reminder.snoozedUntil
      ? reminder.snoozedUntil instanceof Date
        ? reminder.snoozedUntil.toISOString()
        : String(reminder.snoozedUntil)
      : null,
    completedAt: reminder.completedAt
      ? reminder.completedAt instanceof Date
        ? reminder.completedAt.toISOString()
        : String(reminder.completedAt)
      : null,
    notes: reminder.notes ?? null,
    createdAt: reminder.createdAt instanceof Date
      ? reminder.createdAt.toISOString()
      : String(reminder.createdAt),
    updatedAt: reminder.updatedAt instanceof Date
      ? reminder.updatedAt.toISOString()
      : String(reminder.updatedAt),
  };
}

export async function verifyActiveAssignment(
  prisma: PrismaClient,
  midwifeUserId: string,
  motherPublicId: string,
) {
  const mother = await prisma.motherProfile.findFirst({
    where: { publicId: motherPublicId },
  });
  if (!mother) {
    throw new AncServiceError("Ibu hamil tidak ditemukan", 404, "MOTHER_NOT_FOUND");
  }

  const midwife = await prisma.midwifeProfile.findUnique({
    where: { userId: midwifeUserId },
  });
  if (!midwife) {
    throw new AncServiceError("Profil bidan tidak ditemukan", 403, "FORBIDDEN");
  }

  const assignment = await prisma.motherMidwifeAssignment.findFirst({
    where: {
      motherId: mother.id,
      midwifeId: midwife.id,
      status: "ACTIVE",
    },
  });
  if (!assignment) {
    throw new AncServiceError(
      "Akses ditolak: Hanya bidan dengan penugasan aktif yang dapat mengakses data ini",
      403,
      "FORBIDDEN",
    );
  }

  return { mother, midwife, assignment };
}

export async function getActivePregnancy(prisma: PrismaClient, motherId: string) {
  const pregnancy = await prisma.pregnancy.findFirst({
    where: { motherId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  return pregnancy;
}

export async function calculateAdherenceSummary(
  prisma: PrismaClient,
  motherId: string,
): Promise<AdherenceSummary> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const totalTtd = await prisma.reminder.count({
    where: {
      motherId,
      type: "IRON_TABLET",
      scheduledAt: { gte: thirtyDaysAgo },
    },
  });

  const completedTtd = await prisma.reminder.count({
    where: {
      motherId,
      type: "IRON_TABLET",
      status: "COMPLETED",
      scheduledAt: { gte: thirtyDaysAgo },
    },
  });

  const effectiveTotalTtd = totalTtd > 0 ? totalTtd : 30;
  const adherencePercentage = Number(
    ((completedTtd / effectiveTotalTtd) * 100).toFixed(1),
  );

  const totalAnc = await prisma.ancSchedule.count({
    where: { motherId, archivedAt: null },
  });

  const completedAnc = await prisma.ancSchedule.count({
    where: { motherId, status: "COMPLETED", archivedAt: null },
  });

  const now = new Date();
  const missedAnc = await prisma.ancSchedule.count({
    where: {
      motherId,
      archivedAt: null,
      OR: [
        { status: "MISSED" },
        { status: "SCHEDULED", scheduledAt: { lt: now } },
      ],
    },
  });

  const nextSchedule = await prisma.ancSchedule.findFirst({
    where: {
      motherId,
      status: "SCHEDULED",
      scheduledAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      archivedAt: null,
    },
    orderBy: { scheduledAt: "asc" },
    include: scheduleInclude,
  });

  const recentCompletedReminders = await prisma.reminder.findMany({
    where: { motherId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    take: 5,
  });

  const recentCompletedVisits = await prisma.ancSchedule.findMany({
    where: { motherId, status: "COMPLETED", archivedAt: null },
    orderBy: { completedAt: "desc" },
    take: 5,
  });

  const history: AdherenceHistoryItem[] = [
    ...recentCompletedReminders.map((r) => ({
      id: r.publicId,
      date: r.scheduledAt.toISOString(),
      type: r.type,
      label:
        r.type === "IRON_TABLET"
          ? "Tablet Tambah Darah (TTD)"
          : "Pemeriksaan ANC",
      status: "Sudah Diminum",
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    })),
    ...recentCompletedVisits.map((v) => ({
      id: v.publicId,
      date: v.scheduledAt.toISOString(),
      type: "ANC" as const,
      label:
        v.visitType === "DOCTOR_ANC"
          ? "Pemeriksaan Dokter (ANC)"
          : "Pemeriksaan Rutin Bidan (ANC)",
      status: "Sudah Datang",
      completedAt: v.completedAt ? v.completedAt.toISOString() : null,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    ironTabletsTotal: effectiveTotalTtd,
    ironTabletsCompleted: completedTtd,
    ironTabletsAdherencePercentage: Math.min(100, adherencePercentage),
    ancTotalScheduled: totalAnc,
    ancCompleted: completedAnc,
    ancMissedUnconfirmed: missedAnc,
    nextAncSchedule: nextSchedule ? ancScheduleView(nextSchedule) : null,
    recentHistory: history.slice(0, 10),
  };
}

export const DEFAULT_ANC_RULES: AncRuleSet = {
  publicId: "DEFAULT-ANC-KEMENKES-2026",
  version: "KEMENKES-6-VISITS-V1",
  active: true,
  effectiveFrom: "2026-01-01T00:00:00.000Z",
  minimumVisits: 6,
  minimumDoctorVisits: 2,
  sourceReference: "Standar Pelayanan Antenatal Terpadu Kemenkes RI (10T)",
  trimesterDistribution: {
    trimester1: {
      minVisits: 2,
      minDoctorVisits: 1,
      idealWeeks: "K1: Minggu 8-12 (Dokter, USG Trimester 1); K2: Minggu 16 (Bidan)",
    },
    trimester2: {
      minVisits: 2,
      minDoctorVisits: 0,
      idealWeeks: "K3: Minggu 20-24 (Bidan); K4: Minggu 28 (Bidan)",
    },
    trimester3: {
      minVisits: 2,
      minDoctorVisits: 1,
      idealWeeks: "K5: Minggu 32-36 (Dokter, USG Trimester 3); K6: Minggu 38-40 (Bidan)",
    },
  },
};
