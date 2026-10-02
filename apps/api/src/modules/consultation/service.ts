import type { Prisma, PrismaClient } from "@prisma/client";
import { calculateGestationalAge } from "@pfram/validation";
import type {
  ConsultationAttentionFlag,
  ConsultationMessageCreateInput,
  ConsultationMessageItem,
  ConsultationQuery,
  ConsultationThreadStatus,
  ConsultationThreadSummary,
} from "@pfram/shared-types";
import {
  getConsultationMedia,
  saveConsultationMedia,
  validateAndProcessAttachment,
} from "./storage.js";

export class ConsultationError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "ConsultationError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function calculateGestationalWeeks(pregnancy: {
  gestationalAgeSource: string;
  lastMenstrualPeriod: Date | null;
  assessmentDate: Date | null;
  initialGestationalAgeWeeks: number | null;
  initialGestationalAgeDays: number | null;
}): number {
  if (pregnancy.gestationalAgeSource === "LMP" && pregnancy.lastMenstrualPeriod) {
    const age = calculateGestationalAge(pregnancy.lastMenstrualPeriod);
    return age.weeks;
  }
  if (
    pregnancy.assessmentDate &&
    pregnancy.initialGestationalAgeWeeks !== null &&
    pregnancy.initialGestationalAgeDays !== null
  ) {
    const age = calculateGestationalAge(
      pregnancy.assessmentDate,
      pregnancy.initialGestationalAgeWeeks,
      pregnancy.initialGestationalAgeDays,
    );
    return age.weeks;
  }
  return 0;
}

export function formatMessageItem(
  msg: Prisma.ConsultationMessageGetPayload<{
    include: { attachments: true };
  }>,
): ConsultationMessageItem {
  return {
    publicId: msg.publicId,
    senderRole: msg.senderRole as "MOTHER" | "MIDWIFE",
    messageType: msg.messageType as "TEXT" | "IMAGE" | "VOICE",
    body: msg.body,
    readAt: msg.readAt ? msg.readAt.toISOString() : null,
    createdAt: msg.createdAt.toISOString(),
    attachments: (msg.attachments ?? []).map((att) => ({
      publicId: att.publicId,
      fileType: att.fileType as "IMAGE" | "VOICE",
      originalFilename: att.originalFilename,
      mimeType: att.mimeType,
      fileSizeBytes: att.fileSizeBytes,
      durationSeconds: att.durationSeconds,
      downloadUrl: `/api/consultation/attachments/${att.publicId}/file`,
      createdAt: att.createdAt.toISOString(),
    })),
  };
}

export async function getOrCreateMotherThread(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherUserId: string,
): Promise<ConsultationThreadSummary> {
  const mother = await prisma.motherProfile.findUnique({
    where: { userId: motherUserId },
  });
  if (!mother) {
    throw new ConsultationError(404, "MOTHER_NOT_FOUND", "Profil ibu tidak ditemukan");
  }

  const pregnancy = await prisma.pregnancy.findFirst({
    where: { motherId: mother.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!pregnancy) {
    throw new ConsultationError(
      404,
      "NO_ACTIVE_PREGNANCY",
      "Ibu tidak memiliki kehamilan aktif saat ini",
    );
  }

  const assignment = await prisma.motherMidwifeAssignment.findFirst({
    where: {
      motherId: mother.id,
      pregnancyId: pregnancy.id,
      status: "ACTIVE",
    },
    include: {
      midwife: {
        include: {
          primaryFacility: true,
        },
      },
    },
  });

  if (!assignment || !assignment.midwife || !assignment.midwife.active) {
    throw new ConsultationError(
      404,
      "MIDWIFE_NOT_ASSIGNED",
      "Belum ada bidan pendamping aktif yang ditugaskan untuk kehamilan Anda",
    );
  }

  let thread = await prisma.consultationThread.findFirst({
    where: {
      motherId: mother.id,
      midwifeId: assignment.midwifeId,
      pregnancyId: pregnancy.id,
      archivedAt: null,
    },
    include: {
      mother: true,
      midwife: {
        include: {
          primaryFacility: true,
        },
      },
      pregnancy: true,
    },
  });

  if (!thread) {
    thread = await prisma.consultationThread.create({
      data: {
        motherId: mother.id,
        midwifeId: assignment.midwifeId,
        pregnancyId: pregnancy.id,
        status: "OPEN",
        attentionFlag: "NORMAL",
      },
      include: {
        mother: true,
        midwife: {
          include: {
            primaryFacility: true,
          },
        },
        pregnancy: true,
      },
    });
  }

  const unreadCount = await prisma.consultationMessage.count({
    where: {
      threadId: thread.id,
      senderRole: "MIDWIFE",
      readAt: null,
      archivedAt: null,
    },
  });

  const lastMsg = await prisma.consultationMessage.findFirst({
    where: { threadId: thread.id, archivedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return {
    publicId: thread.publicId,
    status: thread.status as ConsultationThreadStatus,
    attentionFlag: thread.attentionFlag as ConsultationAttentionFlag,
    unreadCount,
    lastMessageAt: thread.lastMessageAt ? thread.lastMessageAt.toISOString() : null,
    lastMessagePreview: lastMsg
      ? lastMsg.messageType === "TEXT"
        ? lastMsg.body ?? ""
        : lastMsg.messageType === "IMAGE"
          ? "[Foto]"
          : "[Rekaman Suara]"
      : null,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    mother: {
      publicId: mother.publicId,
      fullName: mother.fullName,
      phoneNumber: mother.familyContactPhone ?? null,
    },
    midwife: {
      publicId: thread.midwife.publicId,
      fullName: thread.midwife.fullName,
      position: thread.midwife.position ?? "Bidan Pendamping",
      phoneNumber: thread.midwife.phoneNumber,
      whatsappNumber: thread.midwife.whatsappNumber,
      serviceStartTime: thread.midwife.serviceStartTime ?? "08:00",
      serviceEndTime: thread.midwife.serviceEndTime ?? "16:00",
      estimatedResponseMinutes: thread.midwife.estimatedResponseMinutes ?? 60,
      primaryFacilityName: thread.midwife.primaryFacility?.name ?? null,
    },
    pregnancy: {
      publicId: pregnancy.publicId,
      gestationalAgeWeeks: calculateGestationalWeeks(pregnancy),
    },
    // Backward compatibility flat properties
    motherPublicId: mother.publicId,
    motherName: mother.fullName,
    motherPhone: mother.familyContactPhone ?? null,
    midwifePublicId: thread.midwife.publicId,
    midwifeName: thread.midwife.fullName,
    midwifePhone: thread.midwife.phoneNumber,
    midwifeWhatsapp: thread.midwife.whatsappNumber,
    facilityName: thread.midwife.primaryFacility?.name ?? null,
    serviceStartTime: thread.midwife.serviceStartTime ?? "08:00",
    serviceEndTime: thread.midwife.serviceEndTime ?? "16:00",
    estimatedResponseMinutes: thread.midwife.estimatedResponseMinutes ?? 60,
  };
}

export async function getMotherMessages(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherUserId: string,
  query: ConsultationQuery = {},
): Promise<{ items: ConsultationMessageItem[]; total: number }> {
  const mother = await prisma.motherProfile.findUnique({
    where: { userId: motherUserId },
  });
  if (!mother) {
    throw new ConsultationError(404, "MOTHER_NOT_FOUND", "Profil ibu tidak ditemukan");
  }

  const pregnancy = await prisma.pregnancy.findFirst({
    where: { motherId: mother.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!pregnancy) {
    return { items: [], total: 0 };
  }

  const thread = await prisma.consultationThread.findFirst({
    where: { motherId: mother.id, pregnancyId: pregnancy.id, archivedAt: null },
  });

  if (!thread) {
    return { items: [], total: 0 };
  }

  const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
  const offset = Math.max(query.offset ?? 0, 0);

  const [total, messages] = await Promise.all([
    prisma.consultationMessage.count({
      where: { threadId: thread.id, archivedAt: null },
    }),
    prisma.consultationMessage.findMany({
      where: { threadId: thread.id, archivedAt: null },
      include: { attachments: true },
      orderBy: { createdAt: "asc" },
      take: limit,
      skip: offset,
    }),
  ]);

  return {
    items: messages.map(formatMessageItem),
    total,
  };
}

export async function sendMotherMessage(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherUserId: string,
  input: ConsultationMessageCreateInput,
): Promise<ConsultationMessageItem> {
  const threadSummary = await getOrCreateMotherThread(prisma, motherUserId);

  const thread = await prisma.consultationThread.findUnique({
    where: { publicId: threadSummary.publicId },
    include: { mother: true },
  });
  if (!thread) {
    throw new ConsultationError(404, "THREAD_NOT_FOUND", "Thread konsultasi tidak ditemukan");
  }

  if (input.messageType === "TEXT" && (!input.body || input.body.trim().length === 0)) {
    throw new ConsultationError(400, "EMPTY_MESSAGE", "Pesan teks tidak boleh kosong");
  }

  if ((input.messageType === "IMAGE" || input.messageType === "VOICE") && !input.attachment) {
    throw new ConsultationError(
      400,
      "MISSING_ATTACHMENT",
      `Lampiran file media diperlukan untuk pesan tipe ${input.messageType}`,
    );
  }

  let processedAttachment: ReturnType<typeof validateAndProcessAttachment> | null = null;
  if (input.attachment) {
    try {
      processedAttachment = validateAndProcessAttachment(input.attachment);
      await saveConsultationMedia(
        processedAttachment.storageKey,
        processedAttachment.buffer,
        input.attachment.mimeType,
      );
    } catch (err) {
      throw new ConsultationError(
        400,
        "ATTACHMENT_PROCESSING_FAILED",
        err instanceof Error ? err.message : "Gagal memproses lampiran media",
      );
    }
  }

  const txRunner = (prisma as PrismaClient).$transaction
    ? <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => (prisma as PrismaClient).$transaction(fn)
    : <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => fn(prisma as Prisma.TransactionClient);

  const createdMessage = await txRunner(async (tx: Prisma.TransactionClient) => {
    const msg = await tx.consultationMessage.create({
      data: {
        threadId: thread.id,
        senderRole: "MOTHER",
        senderUserId: thread.mother.userId,
        messageType: input.messageType,
        body: input.body ? input.body.trim() : null,
      },
    });

    if (processedAttachment && input.attachment) {
      await tx.consultationAttachment.create({
        data: {
          messageId: msg.id,
          fileType: processedAttachment.fileType,
          originalFilename: input.attachment.originalFilename,
          mimeType: input.attachment.mimeType,
          fileSizeBytes: processedAttachment.buffer.length,
          storageKey: processedAttachment.storageKey,
          durationSeconds: input.attachment.durationSeconds ?? null,
        },
      });
    }

    await tx.consultationThread.update({
      where: { id: thread.id },
      data: {
        status: "OPEN",
        lastMessageAt: msg.createdAt,
      },
    });

    return tx.consultationMessage.findUniqueOrThrow({
      where: { id: msg.id },
      include: { attachments: true },
    });
  });

  return formatMessageItem(createdMessage);
}

export async function markMotherMessagesRead(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherUserId: string,
): Promise<{ markedCount: number }> {
  const mother = await prisma.motherProfile.findUnique({
    where: { userId: motherUserId },
  });
  if (!mother) {
    throw new ConsultationError(404, "MOTHER_NOT_FOUND", "Profil ibu tidak ditemukan");
  }

  const pregnancy = await prisma.pregnancy.findFirst({
    where: { motherId: mother.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!pregnancy) {
    return { markedCount: 0 };
  }

  const thread = await prisma.consultationThread.findFirst({
    where: { motherId: mother.id, pregnancyId: pregnancy.id, archivedAt: null },
  });
  if (!thread) {
    return { markedCount: 0 };
  }

  const result = await prisma.consultationMessage.updateMany({
    where: {
      threadId: thread.id,
      senderRole: "MIDWIFE",
      readAt: null,
      archivedAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return { markedCount: result.count };
}

// ==========================================
// MIDWIFE LOGIC
// ==========================================

export async function getMidwifeThreads(
  prisma: PrismaClient | Prisma.TransactionClient,
  midwifeUserId: string,
  query: ConsultationQuery = {},
): Promise<{ items: ConsultationThreadSummary[]; total: number }> {
  const midwife = await prisma.midwifeProfile.findUnique({
    where: { userId: midwifeUserId },
    include: { primaryFacility: true },
  });
  if (!midwife || !midwife.active) {
    throw new ConsultationError(403, "MIDWIFE_INACTIVE", "Profil bidan tidak aktif atau tidak ditemukan");
  }

  const whereClause: Prisma.ConsultationThreadWhereInput = {
    midwifeId: midwife.id,
    archivedAt: null,
  };

  if (query.status) {
    whereClause.status = query.status;
  }

  if (query.attentionFlag) {
    whereClause.attentionFlag = query.attentionFlag;
  }

  if (query.search && query.search.trim().length > 0) {
    const term = query.search.trim();
    whereClause.mother = {
      fullName: { contains: term, mode: "insensitive" },
    };
  }

  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
  const offset = Math.max(query.offset ?? 0, 0);

  const [total, threads] = await Promise.all([
    prisma.consultationThread.count({ where: whereClause }),
    prisma.consultationThread.findMany({
      where: whereClause,
      include: {
        mother: true,
        pregnancy: true,
        messages: {
          where: { archivedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ attentionFlag: "desc" }, { lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
  ]);

  const items: ConsultationThreadSummary[] = await Promise.all(
    threads.map(async (th) => {
      const unreadCount = await prisma.consultationMessage.count({
        where: {
          threadId: th.id,
          senderRole: "MOTHER",
          readAt: null,
          archivedAt: null,
        },
      });

      const lastMsg = th.messages[0];

      return {
        publicId: th.publicId,
        status: th.status as ConsultationThreadStatus,
        attentionFlag: th.attentionFlag as ConsultationAttentionFlag,
        unreadCount,
        lastMessageAt: th.lastMessageAt ? th.lastMessageAt.toISOString() : null,
        lastMessagePreview: lastMsg
          ? lastMsg.messageType === "TEXT"
            ? lastMsg.body ?? ""
            : lastMsg.messageType === "IMAGE"
              ? "[Foto]"
              : "[Rekaman Suara]"
          : null,
        createdAt: th.createdAt.toISOString(),
        updatedAt: th.updatedAt.toISOString(),
        mother: {
          publicId: th.mother.publicId,
          fullName: th.mother.fullName,
          phoneNumber: th.mother.familyContactPhone ?? null,
        },
        midwife: {
          publicId: midwife.publicId,
          fullName: midwife.fullName,
          position: midwife.position ?? "Bidan Pendamping",
          phoneNumber: midwife.phoneNumber,
          whatsappNumber: midwife.whatsappNumber,
          serviceStartTime: midwife.serviceStartTime ?? "08:00",
          serviceEndTime: midwife.serviceEndTime ?? "16:00",
          estimatedResponseMinutes: midwife.estimatedResponseMinutes ?? 60,
          primaryFacilityName: midwife.primaryFacility?.name ?? null,
        },
        pregnancy: {
          publicId: th.pregnancy.publicId,
          gestationalAgeWeeks: calculateGestationalWeeks(th.pregnancy),
        },
        // Backward compatibility flat properties
        motherPublicId: th.mother.publicId,
        motherName: th.mother.fullName,
        motherPhone: th.mother.familyContactPhone ?? null,
        midwifePublicId: midwife.publicId,
        midwifeName: midwife.fullName,
        midwifePhone: midwife.phoneNumber,
        midwifeWhatsapp: midwife.whatsappNumber,
        facilityName: midwife.primaryFacility?.name ?? null,
        serviceStartTime: midwife.serviceStartTime ?? "08:00",
        serviceEndTime: midwife.serviceEndTime ?? "16:00",
        estimatedResponseMinutes: midwife.estimatedResponseMinutes ?? 60,
      };
    }),
  );

  return { items, total };
}

export async function getMidwifeThreadDetail(
  prisma: PrismaClient | Prisma.TransactionClient,
  midwifeUserId: string,
  threadPublicId: string,
): Promise<ConsultationThreadSummary> {
  const midwife = await prisma.midwifeProfile.findUnique({
    where: { userId: midwifeUserId },
    include: { primaryFacility: true },
  });
  if (!midwife || !midwife.active) {
    throw new ConsultationError(403, "MIDWIFE_INACTIVE", "Profil bidan tidak aktif atau tidak ditemukan");
  }

  const thread = await prisma.consultationThread.findUnique({
    where: { publicId: threadPublicId },
    include: {
      mother: true,
      pregnancy: true,
      messages: {
        where: { archivedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!thread || thread.midwifeId !== midwife.id || thread.archivedAt) {
    throw new ConsultationError(
      404,
      "THREAD_NOT_FOUND",
      "Konsultasi tidak ditemukan atau Anda tidak memiliki akses ke konsultasi ini",
    );
  }

  const unreadCount = await prisma.consultationMessage.count({
    where: {
      threadId: thread.id,
      senderRole: "MOTHER",
      readAt: null,
      archivedAt: null,
    },
  });

  const lastMsg = thread.messages[0];

  return {
    publicId: thread.publicId,
    status: thread.status as ConsultationThreadStatus,
    attentionFlag: thread.attentionFlag as ConsultationAttentionFlag,
    unreadCount,
    lastMessageAt: thread.lastMessageAt ? thread.lastMessageAt.toISOString() : null,
    lastMessagePreview: lastMsg
      ? lastMsg.messageType === "TEXT"
        ? lastMsg.body ?? ""
        : lastMsg.messageType === "IMAGE"
          ? "[Foto]"
          : "[Rekaman Suara]"
      : null,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    mother: {
      publicId: thread.mother.publicId,
      fullName: thread.mother.fullName,
      phoneNumber: thread.mother.familyContactPhone ?? null,
    },
    midwife: {
      publicId: midwife.publicId,
      fullName: midwife.fullName,
      position: midwife.position ?? "Bidan Pendamping",
      phoneNumber: midwife.phoneNumber,
      whatsappNumber: midwife.whatsappNumber,
      serviceStartTime: midwife.serviceStartTime ?? "08:00",
      serviceEndTime: midwife.serviceEndTime ?? "16:00",
      estimatedResponseMinutes: midwife.estimatedResponseMinutes ?? 60,
      primaryFacilityName: midwife.primaryFacility?.name ?? null,
    },
    pregnancy: {
      publicId: thread.pregnancy.publicId,
      gestationalAgeWeeks: calculateGestationalWeeks(thread.pregnancy),
    },
    // Backward compatibility flat properties
    motherPublicId: thread.mother.publicId,
    motherName: thread.mother.fullName,
    motherPhone: thread.mother.familyContactPhone ?? null,
    midwifePublicId: midwife.publicId,
    midwifeName: midwife.fullName,
    midwifePhone: midwife.phoneNumber,
    midwifeWhatsapp: midwife.whatsappNumber,
    facilityName: midwife.primaryFacility?.name ?? null,
    serviceStartTime: midwife.serviceStartTime ?? "08:00",
    serviceEndTime: midwife.serviceEndTime ?? "16:00",
    estimatedResponseMinutes: midwife.estimatedResponseMinutes ?? 60,
  };
}

export async function getMidwifeMessages(
  prisma: PrismaClient | Prisma.TransactionClient,
  midwifeUserId: string,
  threadPublicId: string,
  query: ConsultationQuery = {},
): Promise<{ items: ConsultationMessageItem[]; total: number }> {
  const midwife = await prisma.midwifeProfile.findUnique({
    where: { userId: midwifeUserId },
  });
  if (!midwife || !midwife.active) {
    throw new ConsultationError(403, "MIDWIFE_INACTIVE", "Profil bidan tidak aktif atau tidak ditemukan");
  }

  const thread = await prisma.consultationThread.findUnique({
    where: { publicId: threadPublicId },
  });
  if (!thread || thread.midwifeId !== midwife.id || thread.archivedAt) {
    throw new ConsultationError(
      404,
      "THREAD_NOT_FOUND",
      "Konsultasi tidak ditemukan atau Anda tidak memiliki akses ke konsultasi ini",
    );
  }

  const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
  const offset = Math.max(query.offset ?? 0, 0);

  const [total, messages] = await Promise.all([
    prisma.consultationMessage.count({
      where: { threadId: thread.id, archivedAt: null },
    }),
    prisma.consultationMessage.findMany({
      where: { threadId: thread.id, archivedAt: null },
      include: { attachments: true },
      orderBy: { createdAt: "asc" },
      take: limit,
      skip: offset,
    }),
  ]);

  return {
    items: messages.map(formatMessageItem),
    total,
  };
}

export async function sendMidwifeMessage(
  prisma: PrismaClient | Prisma.TransactionClient,
  midwifeUserId: string,
  threadPublicId: string,
  input: ConsultationMessageCreateInput,
): Promise<ConsultationMessageItem> {
  const midwife = await prisma.midwifeProfile.findUnique({
    where: { userId: midwifeUserId },
  });
  if (!midwife || !midwife.active) {
    throw new ConsultationError(403, "MIDWIFE_INACTIVE", "Profil bidan tidak aktif atau tidak ditemukan");
  }

  const thread = await prisma.consultationThread.findUnique({
    where: { publicId: threadPublicId },
  });
  if (!thread || thread.midwifeId !== midwife.id || thread.archivedAt) {
    throw new ConsultationError(
      404,
      "THREAD_NOT_FOUND",
      "Konsultasi tidak ditemukan atau Anda tidak memiliki akses ke konsultasi ini",
    );
  }

  if (input.messageType === "TEXT" && (!input.body || input.body.trim().length === 0)) {
    throw new ConsultationError(400, "EMPTY_MESSAGE", "Pesan teks tidak boleh kosong");
  }

  if ((input.messageType === "IMAGE" || input.messageType === "VOICE") && !input.attachment) {
    throw new ConsultationError(
      400,
      "MISSING_ATTACHMENT",
      `Lampiran file media diperlukan untuk pesan tipe ${input.messageType}`,
    );
  }

  let processedAttachment: ReturnType<typeof validateAndProcessAttachment> | null = null;
  if (input.attachment) {
    try {
      processedAttachment = validateAndProcessAttachment(input.attachment);
      await saveConsultationMedia(
        processedAttachment.storageKey,
        processedAttachment.buffer,
        input.attachment.mimeType,
      );
    } catch (err) {
      throw new ConsultationError(
        400,
        "ATTACHMENT_PROCESSING_FAILED",
        err instanceof Error ? err.message : "Gagal memproses lampiran media",
      );
    }
  }

  const txRunner = (prisma as PrismaClient).$transaction
    ? <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => (prisma as PrismaClient).$transaction(fn)
    : <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => fn(prisma as Prisma.TransactionClient);

  const createdMessage = await txRunner(async (tx: Prisma.TransactionClient) => {
    const msg = await tx.consultationMessage.create({
      data: {
        threadId: thread.id,
        senderRole: "MIDWIFE",
        senderUserId: midwife.userId,
        messageType: input.messageType,
        body: input.body ? input.body.trim() : null,
      },
    });

    if (processedAttachment && input.attachment) {
      await tx.consultationAttachment.create({
        data: {
          messageId: msg.id,
          fileType: processedAttachment.fileType,
          originalFilename: input.attachment.originalFilename,
          mimeType: input.attachment.mimeType,
          fileSizeBytes: processedAttachment.buffer.length,
          storageKey: processedAttachment.storageKey,
          durationSeconds: input.attachment.durationSeconds ?? null,
        },
      });
    }

    await tx.consultationThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: msg.createdAt,
      },
    });

    return tx.consultationMessage.findUniqueOrThrow({
      where: { id: msg.id },
      include: { attachments: true },
    });
  });

  return formatMessageItem(createdMessage);
}

export async function updateMidwifeAttentionFlag(
  prisma: PrismaClient | Prisma.TransactionClient,
  midwifeUserId: string,
  threadPublicId: string,
  flag: ConsultationAttentionFlag,
): Promise<ConsultationThreadSummary> {
  const midwife = await prisma.midwifeProfile.findUnique({
    where: { userId: midwifeUserId },
  });
  if (!midwife || !midwife.active) {
    throw new ConsultationError(403, "MIDWIFE_INACTIVE", "Profil bidan tidak aktif atau tidak ditemukan");
  }

  const thread = await prisma.consultationThread.findUnique({
    where: { publicId: threadPublicId },
  });
  if (!thread || thread.midwifeId !== midwife.id || thread.archivedAt) {
    throw new ConsultationError(
      404,
      "THREAD_NOT_FOUND",
      "Konsultasi tidak ditemukan atau Anda tidak memiliki akses ke konsultasi ini",
    );
  }

  await prisma.consultationThread.update({
    where: { id: thread.id },
    data: { attentionFlag: flag },
  });

  return getMidwifeThreadDetail(prisma, midwifeUserId, threadPublicId);
}

export async function updateMidwifeThreadStatus(
  prisma: PrismaClient | Prisma.TransactionClient,
  midwifeUserId: string,
  threadPublicId: string,
  status: ConsultationThreadStatus,
): Promise<ConsultationThreadSummary> {
  const midwife = await prisma.midwifeProfile.findUnique({
    where: { userId: midwifeUserId },
  });
  if (!midwife || !midwife.active) {
    throw new ConsultationError(403, "MIDWIFE_INACTIVE", "Profil bidan tidak aktif atau tidak ditemukan");
  }

  const thread = await prisma.consultationThread.findUnique({
    where: { publicId: threadPublicId },
  });
  if (!thread || thread.midwifeId !== midwife.id || thread.archivedAt) {
    throw new ConsultationError(
      404,
      "THREAD_NOT_FOUND",
      "Konsultasi tidak ditemukan atau Anda tidak memiliki akses ke konsultasi ini",
    );
  }

  await prisma.consultationThread.update({
    where: { id: thread.id },
    data: { status },
  });

  return getMidwifeThreadDetail(prisma, midwifeUserId, threadPublicId);
}

export async function markMidwifeMessagesRead(
  prisma: PrismaClient | Prisma.TransactionClient,
  midwifeUserId: string,
  threadPublicId: string,
): Promise<{ markedCount: number }> {
  const midwife = await prisma.midwifeProfile.findUnique({
    where: { userId: midwifeUserId },
  });
  if (!midwife || !midwife.active) {
    throw new ConsultationError(403, "MIDWIFE_INACTIVE", "Profil bidan tidak aktif atau tidak ditemukan");
  }

  const thread = await prisma.consultationThread.findUnique({
    where: { publicId: threadPublicId },
  });
  if (!thread || thread.midwifeId !== midwife.id || thread.archivedAt) {
    throw new ConsultationError(
      404,
      "THREAD_NOT_FOUND",
      "Konsultasi tidak ditemukan atau Anda tidak memiliki akses ke konsultasi ini",
    );
  }

  const result = await prisma.consultationMessage.updateMany({
    where: {
      threadId: thread.id,
      senderRole: "MOTHER",
      readAt: null,
      archivedAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return { markedCount: result.count };
}

// ==========================================
// ATTACHMENT STREAMING & ANTI-IDOR
// ==========================================

export async function getAttachmentStream(
  prisma: PrismaClient | Prisma.TransactionClient,
  user: { sub: string; role: string },
  attachmentPublicId: string,
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  // Admin isolation rule
  if (user.role === "ADMIN") {
    throw new ConsultationError(
      403,
      "ADMIN_ACCESS_FORBIDDEN",
      "Admin tidak memiliki izin untuk mengakses media konsultasi privat medis.",
    );
  }

  const attachment = await prisma.consultationAttachment.findUnique({
    where: { publicId: attachmentPublicId },
    include: {
      message: {
        include: {
          thread: {
            include: {
              mother: true,
              midwife: true,
            },
          },
        },
      },
    },
  });

  if (!attachment || !attachment.message || !attachment.message.thread) {
    throw new ConsultationError(404, "ATTACHMENT_NOT_FOUND", "Lampiran tidak ditemukan");
  }

  const thread = attachment.message.thread;

  if (user.role === "MOTHER") {
    if (thread.mother.userId !== user.sub) {
      throw new ConsultationError(403, "FORBIDDEN", "Anda tidak memiliki akses ke lampiran ini");
    }
  } else if (user.role === "MIDWIFE") {
    if (thread.midwife.userId !== user.sub) {
      throw new ConsultationError(403, "FORBIDDEN", "Anda bukan bidan penanggung jawab konsultasi ini");
    }
  } else {
    throw new ConsultationError(403, "FORBIDDEN", "Akses tidak diizinkan");
  }

  const media = await getConsultationMedia(attachment.storageKey, attachment.mimeType);

  return {
    buffer: media.buffer,
    contentType: media.contentType,
    filename: attachment.originalFilename,
  };
}
