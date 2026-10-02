import type { Prisma, PrismaClient } from "@prisma/client";
import { isValidMeetingUrl } from "@pfram/validation";
import type {
  VideoConsultationCreateInput,
  VideoConsultationItem,
  VideoConsultationQuery,
  VideoConsultationStatus,
  VideoConsultationStatusUpdateInput,
  VideoConsultationUpdateInput,
} from "@pfram/shared-types";
import { ConsultationError } from "./service.js";

type VideoWithRelations = Prisma.VideoConsultationGetPayload<{
  include: {
    mother: { include: { user: true } };
    midwife: true;
    pregnancy: true;
    consultationThread: true;
  };
}>;

export function formatVideoConsultationItem(
  v: VideoWithRelations,
): VideoConsultationItem {
  return {
    publicId: v.publicId,
    motherPublicId: v.mother.publicId,
    motherName: v.mother.fullName,
    motherPhone: v.mother.user.phoneNumber,
    midwifePublicId: v.midwife.publicId,
    midwifeName: v.midwife.fullName,
    midwifePhone: v.midwife.phoneNumber,
    midwifeWhatsapp: v.midwife.whatsappNumber,
    pregnancyPublicId: v.pregnancy.publicId,
    threadPublicId: v.consultationThread?.publicId ?? null,
    scheduledAt: v.scheduledAt.toISOString(),
    meetingUrl: v.meetingUrl,
    title: v.title,
    notes: v.notes,
    status: v.status as VideoConsultationStatus,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    completedAt: v.completedAt ? v.completedAt.toISOString() : null,
    cancelledAt: v.cancelledAt ? v.cancelledAt.toISOString() : null,
  };
}

export async function getMotherUpcomingVideo(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherUserId: string,
): Promise<VideoConsultationItem | null> {
  const mother = await prisma.motherProfile.findUnique({
    where: { userId: motherUserId },
  });
  if (!mother) {
    throw new ConsultationError(404, "MOTHER_NOT_FOUND", "Profil ibu tidak ditemukan");
  }

  const video = await prisma.videoConsultation.findFirst({
    where: {
      motherId: mother.id,
      archivedAt: null,
      status: { in: ["SCHEDULED", "ACTIVE"] },
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      mother: { include: { user: true } },
      midwife: true,
      pregnancy: true,
      consultationThread: true,
    },
  });

  return video ? formatVideoConsultationItem(video) : null;
}

export async function listMotherVideoConsultations(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherUserId: string,
  query?: VideoConsultationQuery,
): Promise<{ items: VideoConsultationItem[]; total: number }> {
  const mother = await prisma.motherProfile.findUnique({
    where: { userId: motherUserId },
  });
  if (!mother) {
    throw new ConsultationError(404, "MOTHER_NOT_FOUND", "Profil ibu tidak ditemukan");
  }

  const where: Prisma.VideoConsultationWhereInput = {
    motherId: mother.id,
    archivedAt: null,
  };

  if (query?.status) {
    where.status = query.status;
  }
  if (query?.upcomingOnly) {
    where.status = { in: ["SCHEDULED", "ACTIVE"] };
  }

  const page = query?.page && query.page > 0 ? query.page : 1;
  const limit = query?.limit && query.limit > 0 ? query.limit : 20;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.videoConsultation.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      skip,
      take: limit,
      include: {
        mother: { include: { user: true } },
        midwife: true,
        pregnancy: true,
        consultationThread: true,
      },
    }),
    prisma.videoConsultation.count({ where }),
  ]);

  return {
    items: items.map(formatVideoConsultationItem),
    total,
  };
}

export async function listMidwifeVideoConsultations(
  prisma: PrismaClient | Prisma.TransactionClient,
  midwifeUserId: string,
  query?: VideoConsultationQuery,
): Promise<{ items: VideoConsultationItem[]; total: number }> {
  const midwife = await prisma.midwifeProfile.findUnique({
    where: { userId: midwifeUserId },
  });
  if (!midwife) {
    throw new ConsultationError(404, "MIDWIFE_NOT_FOUND", "Profil bidan tidak ditemukan");
  }

  const where: Prisma.VideoConsultationWhereInput = {
    midwifeId: midwife.id,
    archivedAt: null,
  };

  if (query?.motherPublicId) {
    where.mother = { publicId: query.motherPublicId };
  }
  if (query?.threadPublicId) {
    where.consultationThread = { publicId: query.threadPublicId };
  }
  if (query?.status) {
    where.status = query.status;
  }
  if (query?.upcomingOnly) {
    where.status = { in: ["SCHEDULED", "ACTIVE"] };
  }

  const page = query?.page && query.page > 0 ? query.page : 1;
  const limit = query?.limit && query.limit > 0 ? query.limit : 20;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.videoConsultation.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      skip,
      take: limit,
      include: {
        mother: { include: { user: true } },
        midwife: true,
        pregnancy: true,
        consultationThread: true,
      },
    }),
    prisma.videoConsultation.count({ where }),
  ]);

  return {
    items: items.map(formatVideoConsultationItem),
    total,
  };
}

export async function createMidwifeVideoConsultation(
  prisma: PrismaClient | Prisma.TransactionClient,
  midwifeUserId: string,
  input: VideoConsultationCreateInput,
): Promise<VideoConsultationItem> {
  const midwife = await prisma.midwifeProfile.findUnique({
    where: { userId: midwifeUserId },
  });
  if (!midwife) {
    throw new ConsultationError(404, "MIDWIFE_NOT_FOUND", "Profil bidan tidak ditemukan");
  }

  let motherId: string;
  let pregnancyId: string;
  let consultationThreadId: string | null = null;

  if (input.threadPublicId) {
    const thread = await prisma.consultationThread.findUnique({
      where: { publicId: input.threadPublicId },
    });
    if (!thread) {
      throw new ConsultationError(404, "THREAD_NOT_FOUND", "Thread konsultasi tidak ditemukan");
    }
    if (thread.midwifeId !== midwife.id) {
      throw new ConsultationError(
        403,
        "NOT_ASSIGNED_MIDWIFE",
        "Bidan tidak memiliki akses ke thread konsultasi ini",
      );
    }
    motherId = thread.motherId;
    pregnancyId = thread.pregnancyId;
    consultationThreadId = thread.id;
  } else if (input.motherPublicId) {
    const mother = await prisma.motherProfile.findUnique({
      where: { publicId: input.motherPublicId },
    });
    if (!mother) {
      throw new ConsultationError(404, "MOTHER_NOT_FOUND", "Profil ibu tidak ditemukan");
    }

    const assignment = await prisma.motherMidwifeAssignment.findFirst({
      where: {
        motherId: mother.id,
        midwifeId: midwife.id,
        status: "ACTIVE",
      },
      include: { pregnancy: true },
    });
    if (!assignment) {
      throw new ConsultationError(
        403,
        "NOT_ASSIGNED_MIDWIFE",
        "Bidan tidak memiliki penugasan aktif untuk ibu ini",
      );
    }
    motherId = mother.id;
    pregnancyId = assignment.pregnancyId;

    const existingThread = await prisma.consultationThread.findFirst({
      where: { motherId, midwifeId: midwife.id, status: "OPEN" },
    });
    consultationThreadId = existingThread?.id ?? null;
  } else {
    throw new ConsultationError(
      400,
      "MISSING_TARGET",
      "ID ibu atau thread konsultasi wajib disertakan",
    );
  }

  if (!isValidMeetingUrl(input.meetingUrl)) {
    throw new ConsultationError(
      400,
      "INVALID_MEETING_URL",
      "URL meeting tidak valid atau tidak menggunakan protokol HTTPS",
    );
  }

  const scheduledDate = new Date(input.scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    throw new ConsultationError(
      400,
      "INVALID_SCHEDULED_DATE",
      "Format waktu jadwal video call tidak valid",
    );
  }

  const created = await prisma.videoConsultation.create({
    data: {
      motherId,
      midwifeId: midwife.id,
      pregnancyId,
      consultationThreadId,
      scheduledAt: scheduledDate,
      meetingUrl: input.meetingUrl.trim(),
      title: input.title?.trim() || "Konsultasi Video Ibu Hamil",
      notes: input.notes?.trim() ?? null,
      status: "SCHEDULED",
      createdByUserId: midwife.userId,
    },
    include: {
      mother: { include: { user: true } },
      midwife: true,
      pregnancy: true,
      consultationThread: true,
    },
  });

  return formatVideoConsultationItem(created);
}

export async function updateMidwifeVideoConsultation(
  prisma: PrismaClient | Prisma.TransactionClient,
  midwifeUserId: string,
  videoPublicId: string,
  input: VideoConsultationUpdateInput,
): Promise<VideoConsultationItem> {
  const midwife = await prisma.midwifeProfile.findUnique({
    where: { userId: midwifeUserId },
  });
  if (!midwife) {
    throw new ConsultationError(404, "MIDWIFE_NOT_FOUND", "Profil bidan tidak ditemukan");
  }

  const video = await prisma.videoConsultation.findUnique({
    where: { publicId: videoPublicId },
  });
  if (!video) {
    throw new ConsultationError(404, "VIDEO_NOT_FOUND", "Jadwal video call tidak ditemukan");
  }

  if (video.midwifeId !== midwife.id) {
    throw new ConsultationError(
      403,
      "NOT_ASSIGNED_MIDWIFE",
      "Bidan tidak memiliki wewenang untuk mengubah jadwal video call ini",
    );
  }

  const updateData: Prisma.VideoConsultationUpdateInput = {};

  if (input.meetingUrl !== undefined) {
    if (!isValidMeetingUrl(input.meetingUrl)) {
      throw new ConsultationError(
        400,
        "INVALID_MEETING_URL",
        "URL meeting tidak valid atau tidak menggunakan protokol HTTPS",
      );
    }
    updateData.meetingUrl = input.meetingUrl.trim();
  }

  if (input.scheduledAt !== undefined) {
    const d = new Date(input.scheduledAt);
    if (isNaN(d.getTime())) {
      throw new ConsultationError(
        400,
        "INVALID_SCHEDULED_DATE",
        "Format waktu jadwal video call tidak valid",
      );
    }
    updateData.scheduledAt = d;
  }

  if (input.title !== undefined) {
    updateData.title = input.title.trim();
  }

  if (input.notes !== undefined) {
    updateData.notes = input.notes?.trim() ?? null;
  }

  if (input.status !== undefined) {
    updateData.status = input.status;
    if (input.status === "COMPLETED") {
      updateData.completedAt = new Date();
    } else if (input.status === "CANCELLED") {
      updateData.cancelledAt = new Date();
    }
  }

  const updated = await prisma.videoConsultation.update({
    where: { id: video.id },
    data: updateData,
    include: {
      mother: { include: { user: true } },
      midwife: true,
      pregnancy: true,
      consultationThread: true,
    },
  });

  return formatVideoConsultationItem(updated);
}

export async function updateMidwifeVideoStatus(
  prisma: PrismaClient | Prisma.TransactionClient,
  midwifeUserId: string,
  videoPublicId: string,
  input: VideoConsultationStatusUpdateInput,
): Promise<VideoConsultationItem> {
  return updateMidwifeVideoConsultation(prisma, midwifeUserId, videoPublicId, {
    status: input.status,
    notes: input.notes,
  });
}
