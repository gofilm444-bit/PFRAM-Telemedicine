import { Prisma, type PrismaClient, type HomeVisitStatus } from "@prisma/client";
import type {
  HomeVisitCreateInput,
  HomeVisitItem,
  HomeVisitQuery,
  HomeVisitUpdateInput,
  MidwifeAttentionItem,
  MidwifeDashboardSummary,
  MidwifeEnrichedMotherItem,
  MidwifeMotherFilter,
  MidwifeTodayScheduleItem,
} from "@pfram/shared-types";
import { calculateGestationalAge, trimesterFromWeeks } from "@pfram/validation";

export class DashboardError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DashboardError";
  }
}

export async function getMidwifeProfile(
  prisma: PrismaClient,
  userId: string,
) {
  const profile = await prisma.midwifeProfile.findUnique({
    where: { userId },
    include: { primaryFacility: true },
  });
  if (!profile) {
    throw new DashboardError(
      404,
      "MIDWIFE_NOT_FOUND",
      "Profil bidan tidak ditemukan",
    );
  }
  return profile;
}

export async function getMotherProfile(
  prisma: PrismaClient,
  userId: string,
) {
  const profile = await prisma.motherProfile.findUnique({
    where: { userId },
    include: {
      pregnancies: {
        where: { status: "ACTIVE" },
        take: 1,
      },
    },
  });
  if (!profile) {
    throw new DashboardError(
      404,
      "MOTHER_NOT_FOUND",
      "Profil ibu tidak ditemukan",
    );
  }
  return profile;
}

export async function getActiveMotherIds(
  prisma: PrismaClient,
  midwifeId: string,
): Promise<string[]> {
  const assignments = await prisma.motherMidwifeAssignment.findMany({
    where: { midwifeId, status: "ACTIVE" },
    select: { motherId: true },
  });
  return assignments.map((a) => a.motherId);
}

// 1. Dashboard Summary
export async function getMidwifeDashboardSummary(
  prisma: PrismaClient,
  midwifeUserId: string,
): Promise<MidwifeDashboardSummary> {
  const midwife = await getMidwifeProfile(prisma, midwifeUserId);
  const activeMotherIds = await getActiveMotherIds(prisma, midwife.id);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  if (activeMotherIds.length === 0) {
    return {
      activeMothersCount: 0,
      todayMonitoringCount: 0,
      todayAncCount: 0,
      unconfirmedAncCount: 0,
      pendingDangerScreeningCount: 0,
      unreadConsultationCount: 0,
      todayVideoCallCount: 0,
      todayHomeVisitCount: 0,
      monthlyRecap: {
        totalAssignedMothers: 0,
        completedAncThisMonth: 0,
        unconfirmedAncTotal: 0,
        screeningsThisMonth: 0,
        dangerFollowUpsCompletedThisMonth: 0,
        activeConsultationThreads: 0,
        completedP4kPlans: 0,
        completedHomeVisitsThisMonth: 0,
      },
    };
  }

  const [
    todayMonitoringCount,
    todayAncCount,
    unconfirmedAncCount,
    pendingDangerScreeningCount,
    unreadConsultationCount,
    todayVideoCallCount,
    todayHomeVisitCount,
    completedAncThisMonth,
    screeningsThisMonth,
    dangerFollowUpsCompletedThisMonth,
    activeConsultationThreads,
    completedP4kPlans,
    completedHomeVisitsThisMonth,
  ] = await Promise.all([
    // Today physical monitoring
    prisma.monitoringEntry.count({
      where: {
        motherId: { in: activeMotherIds },
        archivedAt: null,
        recordedAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    // Today ANC
    prisma.ancSchedule.count({
      where: {
        motherId: { in: activeMotherIds },
        archivedAt: null,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    // Unconfirmed ANC (scheduled in past but not completed/cancelled)
    prisma.ancSchedule.count({
      where: {
        motherId: { in: activeMotherIds },
        archivedAt: null,
        scheduledAt: { lt: startOfDay },
        status: "SCHEDULED",
      },
    }),
    // Danger screening pending follow-up
    prisma.dangerScreening.count({
      where: {
        motherId: { in: activeMotherIds },
        archivedAt: null,
        status: { not: "NO_DANGER_REPORTED" },
        followUpStatus: { in: ["PENDING", "CONTACTED"] },
      },
    }),
    // Unread consultation messages from mothers
    prisma.consultationMessage.count({
      where: {
        thread: { midwifeId: midwife.id, archivedAt: null },
        senderRole: "MOTHER",
        readAt: null,
        archivedAt: null,
      },
    }),
    // Today video calls
    prisma.videoConsultation.count({
      where: {
        midwifeId: midwife.id,
        archivedAt: null,
        status: { in: ["SCHEDULED", "ACTIVE"] },
        scheduledAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    // Today home visits
    prisma.homeVisitSchedule.count({
      where: {
        midwifeId: midwife.id,
        archivedAt: null,
        status: "SCHEDULED",
        scheduledAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    // Monthly completed ANC
    prisma.ancSchedule.count({
      where: {
        motherId: { in: activeMotherIds },
        archivedAt: null,
        status: "COMPLETED",
        completedAt: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    // Screenings this month
    prisma.dangerScreening.count({
      where: {
        motherId: { in: activeMotherIds },
        archivedAt: null,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    // Danger follow ups resolved this month
    prisma.dangerScreening.count({
      where: {
        motherId: { in: activeMotherIds },
        archivedAt: null,
        followUpStatus: "RESOLVED",
        updatedAt: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    // Active consultation threads
    prisma.consultationThread.count({
      where: {
        midwifeId: midwife.id,
        status: "OPEN",
        archivedAt: null,
      },
    }),
    // Completed P4K plans
    prisma.p4kPlan.count({
      where: {
        motherId: { in: activeMotherIds },
        archivedAt: null,
      },
    }),
    // Completed home visits this month
    prisma.homeVisitSchedule.count({
      where: {
        midwifeId: midwife.id,
        archivedAt: null,
        status: "COMPLETED",
        completedAt: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
  ]);

  return {
    activeMothersCount: activeMotherIds.length,
    todayMonitoringCount,
    todayAncCount,
    unconfirmedAncCount,
    pendingDangerScreeningCount,
    unreadConsultationCount,
    todayVideoCallCount,
    todayHomeVisitCount,
    monthlyRecap: {
      totalAssignedMothers: activeMotherIds.length,
      completedAncThisMonth,
      unconfirmedAncTotal: unconfirmedAncCount,
      screeningsThisMonth,
      dangerFollowUpsCompletedThisMonth,
      activeConsultationThreads,
      completedP4kPlans,
      completedHomeVisitsThisMonth,
    },
  };
}

// 2. Dashboard Attention Priorities ("Perlu Ditindaklanjuti")
export async function getMidwifeDashboardAttention(
  prisma: PrismaClient,
  midwifeUserId: string,
): Promise<MidwifeAttentionItem[]> {
  const midwife = await getMidwifeProfile(prisma, midwifeUserId);
  const activeMotherIds = await getActiveMotherIds(prisma, midwife.id);

  if (activeMotherIds.length === 0) return [];

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const items: MidwifeAttentionItem[] = [];

  // A. Danger screenings pending follow up (Urgency: HIGH)
  const pendingScreenings = await prisma.dangerScreening.findMany({
    where: {
      motherId: { in: activeMotherIds },
      archivedAt: null,
      status: { not: "NO_DANGER_REPORTED" },
      followUpStatus: { in: ["PENDING", "CONTACTED"] },
    },
    include: { mother: true },
    orderBy: { screenedAt: "desc" },
    take: 10,
  });

  for (const s of pendingScreenings) {
    items.push({
      id: `danger-${s.publicId}`,
      type: "PENDING_DANGER",
      urgency: "HIGH",
      title: `Tanda Bahaya: ${s.mother.fullName}`,
      description: `Laporan tanda bahaya (${s.reportedSignsCount} gejala) status ${s.followUpStatus}. Butuh tindak lanjut.`,
      motherPublicId: s.mother.publicId,
      motherName: s.mother.fullName,
      targetDate: s.screenedAt.toISOString(),
      actionUrl: `/my-mothers/${s.mother.publicId}?tab=screening`,
    });
  }

  // B. Overdue ANC (Urgency: HIGH)
  const overdueAncs = await prisma.ancSchedule.findMany({
    where: {
      motherId: { in: activeMotherIds },
      archivedAt: null,
      scheduledAt: { lt: startOfDay },
      status: "SCHEDULED",
    },
    include: { mother: true },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });

  for (const a of overdueAncs) {
    items.push({
      id: `anc-${a.publicId}`,
      type: "OVERDUE_ANC",
      urgency: "HIGH",
      title: `ANC Terlewat: ${a.mother.fullName}`,
      description: `Jadwal kunjungan ${a.visitType} pada ${a.scheduledAt.toLocaleDateString("id-ID")} belum tercatat selesai.`,
      motherPublicId: a.mother.publicId,
      motherName: a.mother.fullName,
      targetDate: a.scheduledAt.toISOString(),
      actionUrl: `/my-mothers/${a.mother.publicId}?tab=anc`,
    });
  }

  // C. Consultation Threads needing attention (Urgency: HIGH)
  const attentionThreads = await prisma.consultationThread.findMany({
    where: {
      midwifeId: midwife.id,
      attentionFlag: "NEEDS_ATTENTION",
      status: "OPEN",
      archivedAt: null,
    },
    include: { mother: true },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  for (const t of attentionThreads) {
    items.push({
      id: `thread-att-${t.publicId}`,
      type: "CONSULTATION_ATTENTION",
      urgency: "HIGH",
      title: `Konsultasi Perlu Perhatian: ${t.mother.fullName}`,
      description: `Percakapan ditandai membutuhkan perhatian khusus oleh bidan.`,
      motherPublicId: t.mother.publicId,
      motherName: t.mother.fullName,
      targetDate: t.lastMessageAt?.toISOString() ?? t.updatedAt.toISOString(),
      actionUrl: `/consultations`,
    });
  }

  // D. Unread Messages from mothers (Urgency: MEDIUM)
  const threadsWithUnread = await prisma.consultationThread.findMany({
    where: {
      midwifeId: midwife.id,
      status: "OPEN",
      archivedAt: null,
      messages: {
        some: {
          senderRole: "MOTHER",
          readAt: null,
          archivedAt: null,
        },
      },
    },
    include: {
      mother: true,
      messages: {
        where: {
          senderRole: "MOTHER",
          readAt: null,
          archivedAt: null,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    take: 10,
  });

  for (const t of threadsWithUnread) {
    if (items.some((i) => i.id === `thread-att-${t.publicId}`)) continue;
    items.push({
      id: `unread-${t.publicId}`,
      type: "UNREAD_MESSAGE",
      urgency: "MEDIUM",
      title: `Pesan Baru: ${t.mother.fullName}`,
      description: `${t.messages.length} pesan belum dibaca dari ibu hamil.`,
      motherPublicId: t.mother.publicId,
      motherName: t.mother.fullName,
      targetDate: t.messages[0]?.createdAt.toISOString(),
      actionUrl: `/consultations`,
    });
  }

  // E. Home Visits scheduled today or pending (Urgency: HIGH)
  const todayVisits = await prisma.homeVisitSchedule.findMany({
    where: {
      midwifeId: midwife.id,
      archivedAt: null,
      status: "SCHEDULED",
      scheduledAt: { lte: endOfDay },
    },
    include: { mother: true },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });

  for (const v of todayVisits) {
    items.push({
      id: `visit-${v.publicId}`,
      type: "TODAY_HOME_VISIT",
      urgency: "HIGH",
      title: `Kunjungan Rumah: ${v.mother.fullName}`,
      description: `Rencana kunjungan: "${v.purpose}". Jadwal: ${v.scheduledAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}.`,
      motherPublicId: v.mother.publicId,
      motherName: v.mother.fullName,
      targetDate: v.scheduledAt.toISOString(),
      actionUrl: `/my-mothers/${v.mother.publicId}?tab=visits`,
    });
  }

  // F. Incomplete P4K for mothers near term (>= 32 weeks) (Urgency: MEDIUM)
  const latePregnancies = await prisma.pregnancy.findMany({
    where: {
      motherId: { in: activeMotherIds },
      status: "ACTIVE",
    },
    include: {
      mother: {
        include: {
          p4kPlans: {
            where: { archivedAt: null },
            include: { checklistItems: true },
          },
        },
      },
    },
  });

  for (const preg of latePregnancies) {
    const age = calculateGestationalAge(
      preg.estimatedDueDate.toISOString().slice(0, 10),
      preg.initialGestationalAgeWeeks ?? 0,
      preg.initialGestationalAgeDays ?? 0,
      new Date(),
    );
    if (age.weeks >= 32) {
      const plan = preg.mother.p4kPlans[0];
      const isComplete = Boolean(
        plan &&
          plan.deliveryFacilityId &&
          plan.birthCompanionName &&
          plan.transportation &&
          plan.fundingSource,
      );
      if (!isComplete) {
        items.push({
          id: `p4k-${preg.publicId}`,
          type: "INCOMPLETE_P4K",
          urgency: "MEDIUM",
          title: `P4K Belum Lengkap: ${preg.mother.fullName}`,
          description: `Usia kehamilan ${age.weeks} minggu. Tempat persalinan, transportasi, atau pendamping belum tuntas.`,
          motherPublicId: preg.mother.publicId,
          motherName: preg.mother.fullName,
          targetDate: preg.estimatedDueDate.toISOString(),
          actionUrl: `/my-mothers/${preg.mother.publicId}?tab=p4k`,
        });
      }
    }
  }

  // Sort by urgency HIGH first, then by targetDate
  items.sort((a, b) => {
    if (a.urgency === "HIGH" && b.urgency !== "HIGH") return -1;
    if (a.urgency !== "HIGH" && b.urgency === "HIGH") return 1;
    return new Date(a.targetDate ?? 0).getTime() - new Date(b.targetDate ?? 0).getTime();
  });

  return items;
}

// 3. Today Schedule
export async function getMidwifeTodaySchedule(
  prisma: PrismaClient,
  midwifeUserId: string,
): Promise<MidwifeTodayScheduleItem[]> {
  const midwife = await getMidwifeProfile(prisma, midwifeUserId);
  const activeMotherIds = await getActiveMotherIds(prisma, midwife.id);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const schedule: MidwifeTodayScheduleItem[] = [];

  // A. ANC Visits today
  if (activeMotherIds.length > 0) {
    const todayAncs = await prisma.ancSchedule.findMany({
      where: {
        motherId: { in: activeMotherIds },
        archivedAt: null,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        mother: true,
        facility: true,
      },
      orderBy: { scheduledAt: "asc" },
    });

    for (const a of todayAncs) {
      schedule.push({
        id: `anc-${a.publicId}`,
        time: a.scheduledAt.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "ANC",
        title: a.visitType === "DOCTOR_ANC" ? "Pemeriksaan Dokter (ANC)" : "Kunjungan Rutin ANC",
        motherPublicId: a.mother.publicId,
        motherName: a.mother.fullName,
        locationOrLink: a.facility?.name ?? "Fasilitas Kesehatan",
        status: a.status,
        actionUrl: `/my-mothers/${a.mother.publicId}?tab=anc`,
      });
    }
  }

  // B. Video Consultations today
  const todayVideos = await prisma.videoConsultation.findMany({
    where: {
      midwifeId: midwife.id,
      archivedAt: null,
      scheduledAt: { gte: startOfDay, lte: endOfDay },
    },
    include: { mother: true },
    orderBy: { scheduledAt: "asc" },
  });

  for (const v of todayVideos) {
    schedule.push({
      id: `video-${v.publicId}`,
      time: v.scheduledAt.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "VIDEO_CALL",
      title: v.title || "Video Call Ibu & Bidan",
      motherPublicId: v.mother.publicId,
      motherName: v.mother.fullName,
      locationOrLink: v.meetingUrl,
      status: v.status,
      actionUrl: `/consultations`,
    });
  }

  // C. Home Visits today
  const todayVisits = await prisma.homeVisitSchedule.findMany({
    where: {
      midwifeId: midwife.id,
      archivedAt: null,
      scheduledAt: { gte: startOfDay, lte: endOfDay },
    },
    include: { mother: true },
    orderBy: { scheduledAt: "asc" },
  });

  for (const h of todayVisits) {
    schedule.push({
      id: `visit-${h.publicId}`,
      time: h.scheduledAt.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "HOME_VISIT",
      title: `Kunjungan Rumah: ${h.purpose}`,
      motherPublicId: h.mother.publicId,
      motherName: h.mother.fullName,
      locationOrLink: h.mother.address ?? "Alamat Domisili Ibu",
      status: h.status,
      actionUrl: `/my-mothers/${h.mother.publicId}?tab=visits`,
    });
  }

  // Sort by time
  schedule.sort((a, b) => a.time.localeCompare(b.time));

  return schedule;
}

// 4. Enriched Mothers List
export async function getMidwifeEnrichedMothers(
  prisma: PrismaClient,
  midwifeUserId: string,
  query: {
    search?: string | undefined;
    filter?: MidwifeMotherFilter | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  },
): Promise<{ items: MidwifeEnrichedMotherItem[]; total: number }> {
  const midwife = await getMidwifeProfile(prisma, midwifeUserId);
  const activeMotherIds = await getActiveMotherIds(prisma, midwife.id);

  if (activeMotherIds.length === 0) {
    return { items: [], total: 0 };
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  // Fetch all active assigned mothers with related summaries
  const mothers = await prisma.motherProfile.findMany({
    where: {
      id: { in: activeMotherIds },
      ...(query.search
        ? { fullName: { contains: query.search, mode: "insensitive" } }
        : {}),
    },
    include: {
      user: { select: { phoneNumber: true } },
      primaryFacility: { select: { publicId: true, name: true } },
      pregnancies: {
        where: { status: "ACTIVE" },
        take: 1,
      },
      ancSchedules: {
        where: { archivedAt: null },
        orderBy: { scheduledAt: "asc" },
      },
      monitoringEntries: {
        where: { archivedAt: null },
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
      p4kPlans: {
        where: { archivedAt: null },
        include: { checklistItems: true },
        take: 1,
      },
      dangerScreenings: {
        where: {
          archivedAt: null,
          status: { not: "NO_DANGER_REPORTED" },
          followUpStatus: { in: ["PENDING", "CONTACTED"] },
        },
      },
      consultationThreads: {
        where: { midwifeId: midwife.id, archivedAt: null },
        include: {
          messages: {
            where: { senderRole: "MOTHER", readAt: null, archivedAt: null },
          },
        },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const enrichedList: MidwifeEnrichedMotherItem[] = mothers.map((m) => {
    const activePregnancy = m.pregnancies[0];
    let pregInfo = null;

    if (activePregnancy) {
      const eddStr = activePregnancy.estimatedDueDate.toISOString().slice(0, 10);
      const ga = calculateGestationalAge(
        eddStr,
        activePregnancy.initialGestationalAgeWeeks ?? 0,
        activePregnancy.initialGestationalAgeDays ?? 0,
        now,
      );
      const trim = trimesterFromWeeks(ga.weeks);
      pregInfo = {
        publicId: activePregnancy.publicId,
        gestationalAge: { weeks: ga.weeks, days: ga.days },
        trimester: trim,
        estimatedDueDate: eddStr,
      };
    }

    // Next upcoming ANC visit
    const nextAncSchedule = m.ancSchedules.find(
      (a) => a.status === "SCHEDULED" && a.scheduledAt >= startOfDay,
    );
    const nextAnc = nextAncSchedule
      ? {
          publicId: nextAncSchedule.publicId,
          scheduledAt: nextAncSchedule.scheduledAt.toISOString(),
          visitType: nextAncSchedule.visitType,
        }
      : null;

    // Has missed ANC
    const hasMissedAnc = m.ancSchedules.some(
      (a) => a.status === "SCHEDULED" && a.scheduledAt < startOfDay,
    );

    // Latest monitoring
    const lastMon = m.monitoringEntries[0];
    const lastMonitoring = lastMon
      ? {
          recordedAt: lastMon.recordedAt.toISOString(),
          systolicBp: lastMon.systolicBp,
          diastolicBp: lastMon.diastolicBp,
          weightKg: lastMon.weightKg ? Number(lastMon.weightKg) : null,
        }
      : null;

    // P4K status
    const plan = m.p4kPlans[0];
    const totalChecklist = plan?.checklistItems.length ?? 0;
    const checkedCount = plan?.checklistItems.filter((i) => i.checked).length ?? 0;
    const isComplete = Boolean(
      plan &&
        plan.deliveryFacilityId &&
        plan.birthCompanionName &&
        plan.transportation &&
        plan.fundingSource,
    );

    // Attention / Follow up flags
    const followUpReasons: string[] = [];
    if (m.dangerScreenings.length > 0) {
      followUpReasons.push("Skrining tanda bahaya perlu tindak lanjut");
    }
    if (hasMissedAnc) {
      followUpReasons.push("Kunjungan ANC terlewat");
    }
    const thread = m.consultationThreads[0];
    if (thread?.attentionFlag === "NEEDS_ATTENTION") {
      followUpReasons.push("Telekonsultasi perlu perhatian");
    }
    const unreadMessagesCount =
      thread?.messages.length ?? 0;
    if (unreadMessagesCount > 0) {
      followUpReasons.push(`${unreadMessagesCount} pesan baru`);
    }

    const hasFollowUp = followUpReasons.length > 0;

    return {
      publicId: m.publicId,
      userId: m.userId,
      fullName: m.fullName,
      phoneNumber: m.user?.phoneNumber ?? null,
      address: m.address,
      facility: m.primaryFacility,
      activePregnancy: pregInfo,
      nextAnc,
      lastMonitoring,
      p4kStatus: {
        isComplete,
        checkedCount,
        totalCount: totalChecklist,
      },
      hasFollowUp,
      followUpReasons,
      unreadMessagesCount,
      hasMissedAnc,
    };
  });

  // Apply filter
  let filtered = enrichedList;
  const filter = query.filter ?? "ALL";

  if (filter === "TRIMESTER_1") {
    filtered = filtered.filter((m) => m.activePregnancy?.trimester === 1);
  } else if (filter === "TRIMESTER_2") {
    filtered = filtered.filter((m) => m.activePregnancy?.trimester === 2);
  } else if (filter === "TRIMESTER_3") {
    filtered = filtered.filter((m) => m.activePregnancy?.trimester === 3);
  } else if (filter === "HAS_FOLLOW_UP") {
    filtered = filtered.filter((m) => m.hasFollowUp);
  } else if (filter === "MISSED_ANC") {
    filtered = filtered.filter((m) => m.hasMissedAnc);
  }

  const total = filtered.length;
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const startIndex = (page - 1) * limit;
  const items = filtered.slice(startIndex, startIndex + limit);

  return { items, total };
}

// 5. Home Visits Management
export async function listMidwifeHomeVisits(
  prisma: PrismaClient,
  midwifeUserId: string,
  query?: HomeVisitQuery,
): Promise<{ items: HomeVisitItem[]; total: number }> {
  const midwife = await getMidwifeProfile(prisma, midwifeUserId);

  const where: Prisma.HomeVisitScheduleWhereInput = {
    midwifeId: midwife.id,
    archivedAt: null,
    ...(query?.status ? { status: query.status } : {}),
    ...(query?.upcomingOnly
      ? {
          status: "SCHEDULED",
          scheduledAt: { gte: new Date() },
        }
      : {}),
    ...(query?.motherPublicId
      ? { mother: { publicId: query.motherPublicId } }
      : {}),
  };

  const page = query?.page ?? 1;
  const limit = query?.limit ?? 20;

  const [rows, total] = await Promise.all([
    prisma.homeVisitSchedule.findMany({
      where,
      include: {
        mother: true,
        midwife: true,
      },
      orderBy: { scheduledAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.homeVisitSchedule.count({ where }),
  ]);

  return {
    items: rows.map(formatHomeVisitItem),
    total,
  };
}

export async function createMidwifeHomeVisit(
  prisma: PrismaClient,
  midwifeUserId: string,
  input: HomeVisitCreateInput,
): Promise<HomeVisitItem> {
  const midwife = await getMidwifeProfile(prisma, midwifeUserId);

  const mother = await prisma.motherProfile.findUnique({
    where: { publicId: input.motherPublicId },
    include: {
      pregnancies: {
        where: { status: "ACTIVE" },
        take: 1,
      },
    },
  });

  if (!mother) {
    throw new DashboardError(
      404,
      "MOTHER_NOT_FOUND",
      "Ibu hamil tidak ditemukan",
    );
  }

  // Anti-IDOR: Check active assignment
  const assignment = await prisma.motherMidwifeAssignment.findFirst({
    where: {
      midwifeId: midwife.id,
      motherId: mother.id,
      status: "ACTIVE",
    },
  });

  if (!assignment) {
    throw new DashboardError(
      403,
      "FORBIDDEN",
      "Anda tidak memiliki hak akses penugasan aktif untuk ibu hamil ini",
    );
  }

  const visit = await prisma.homeVisitSchedule.create({
    data: {
      midwifeId: midwife.id,
      motherId: mother.id,
      pregnancyId: mother.pregnancies[0]?.id ?? null,
      scheduledAt: new Date(input.scheduledAt),
      purpose: input.purpose.trim(),
      notes: input.notes?.trim() ?? null,
      status: "SCHEDULED",
      createdByUserId: midwifeUserId,
    },
    include: {
      mother: true,
      midwife: true,
    },
  });

  return formatHomeVisitItem(visit);
}

export async function updateMidwifeHomeVisit(
  prisma: PrismaClient,
  midwifeUserId: string,
  publicId: string,
  input: HomeVisitUpdateInput,
): Promise<HomeVisitItem> {
  const midwife = await getMidwifeProfile(prisma, midwifeUserId);

  const existing = await prisma.homeVisitSchedule.findUnique({
    where: { publicId },
    include: { mother: true },
  });

  if (!existing || existing.midwifeId !== midwife.id || existing.archivedAt) {
    throw new DashboardError(
      404,
      "HOME_VISIT_NOT_FOUND",
      "Jadwal kunjungan rumah tidak ditemukan",
    );
  }

  const updateData: Prisma.HomeVisitScheduleUpdateInput = {};
  if (input.scheduledAt) updateData.scheduledAt = new Date(input.scheduledAt);
  if (input.purpose !== undefined) updateData.purpose = input.purpose.trim();
  if (input.notes !== undefined) updateData.notes = input.notes?.trim() ?? null;
  if (input.status) {
    updateData.status = input.status;
    if (input.status === "COMPLETED") {
      updateData.completedAt = new Date();
    }
  }

  const updated = await prisma.homeVisitSchedule.update({
    where: { id: existing.id },
    data: updateData,
    include: {
      mother: true,
      midwife: true,
    },
  });

  return formatHomeVisitItem(updated);
}

export async function listMotherHomeVisits(
  prisma: PrismaClient,
  motherUserId: string,
  query?: HomeVisitQuery,
): Promise<{ items: HomeVisitItem[]; total: number }> {
  const mother = await getMotherProfile(prisma, motherUserId);

  const where: Prisma.HomeVisitScheduleWhereInput = {
    motherId: mother.id,
    archivedAt: null,
    ...(query?.status ? { status: query.status } : {}),
  };

  const page = query?.page ?? 1;
  const limit = query?.limit ?? 20;

  const [rows, total] = await Promise.all([
    prisma.homeVisitSchedule.findMany({
      where,
      include: {
        mother: true,
        midwife: true,
      },
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.homeVisitSchedule.count({ where }),
  ]);

  return {
    items: rows.map(formatHomeVisitItem),
    total,
  };
}

type HomeVisitDbRow = {
  publicId: string;
  scheduledAt: Date;
  purpose: string;
  notes: string | null;
  status: HomeVisitStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  pregnancyId?: string | null;
  mother: {
    publicId: string;
    fullName: string;
    phoneNumber?: string | null;
    address?: string | null;
  };
  midwife: {
    publicId: string;
    fullName: string;
  };
};

function formatHomeVisitItem(v: HomeVisitDbRow): HomeVisitItem {
  return {
    publicId: v.publicId,
    motherPublicId: v.mother.publicId,
    motherName: v.mother.fullName,
    motherPhone: v.mother.phoneNumber ?? null,
    motherAddress: v.mother.address ?? null,
    pregnancyPublicId: v.pregnancyId ?? null,
    midwifePublicId: v.midwife.publicId,
    midwifeName: v.midwife.fullName,
    scheduledAt: v.scheduledAt.toISOString(),
    purpose: v.purpose,
    notes: v.notes ?? null,
    status: v.status,
    completedAt: v.completedAt?.toISOString() ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}
