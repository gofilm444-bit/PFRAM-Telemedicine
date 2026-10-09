import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type {
  AncVisitStatus,
  AncVisitType,
  Prisma,
  ReminderStatus,
  ReminderType,
} from "@prisma/client";
import { z } from "zod";
import {
  ancScheduleCreateSchema,
  ancScheduleUpdateSchema,
  reminderSettingsUpdateSchema,
  reminderSnoozeSchema,
  isAncAppointmentDayArrived,
} from "@pfram/validation";
import { audit } from "../auth/service.js";
import {
  ancScheduleView,
  calculateAdherenceSummary,
  DEFAULT_ANC_RULES,
  getActivePregnancy,
  reminderInclude,
  reminderView,
  scheduleInclude,
  verifyActiveAssignment,
} from "./service.js";
import { formatZodErrorMessage } from "../../shared/validation.js";

const invalid = (
  reply: FastifyReply,
  app: FastifyInstance,
  req: FastifyRequest,
  error: z.ZodError,
) =>
  reply
    .code(400)
    .send(
      app.fail(
        req,
        "VALIDATION_ERROR",
        formatZodErrorMessage(error),
        error.flatten(),
      ),
    );

const actor = (req: FastifyRequest) => ({
  actorUserId: req.user.sub,
  actorRole: req.user.role,
});

export async function motherAncRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MOTHER"]));

  // 1. GET /api/mother/anc-schedules
  app.get("/anc-schedules", async (req, reply) => {
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const query = req.query as {
      status?: string;
      page?: string;
      limit?: string;
      sort?: string;
    };

    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? "20", 10) || 20));
    const sort = query.sort === "desc" ? "desc" : "asc";

    const where: Prisma.AncScheduleWhereInput = {
      motherId: mother.id,
      archivedAt: null,
      ...(query.status && query.status !== "ALL"
        ? { status: query.status as AncVisitStatus }
        : {}),
    };

    const [items, total] = await Promise.all([
      app.prisma.ancSchedule.findMany({
        where,
        orderBy: { scheduledAt: sort },
        skip: (page - 1) * limit,
        take: limit,
        include: scheduleInclude,
      }),
      app.prisma.ancSchedule.count({ where }),
    ]);

    return reply.send(
      app.ok(req, {
        items: items.map(ancScheduleView),
        total,
        page,
        limit,
      }),
    );
  });

  // 2. GET /api/mother/anc-schedules/upcoming
  app.get("/anc-schedules/upcoming", async (req, reply) => {
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const schedule = await app.prisma.ancSchedule.findFirst({
      where: {
        motherId: mother.id,
        status: "SCHEDULED",
        scheduledAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        archivedAt: null,
      },
      orderBy: { scheduledAt: "asc" },
      include: scheduleInclude,
    });

    return reply.send(
      app.ok(req, schedule ? ancScheduleView(schedule) : null),
    );
  });

  // 3. GET /api/mother/anc-schedules/:publicId
  app.get("/anc-schedules/:publicId", async (req, reply) => {
    const { publicId } = req.params as { publicId: string };
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const schedule = await app.prisma.ancSchedule.findFirst({
      where: { publicId, motherId: mother.id, archivedAt: null },
      include: scheduleInclude,
    });

    if (!schedule) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Jadwal ANC tidak ditemukan"));
    }

    return reply.send(app.ok(req, ancScheduleView(schedule)));
  });

  // 4. POST /api/mother/anc-schedules/:publicId/confirm-attendance
  app.post("/anc-schedules/:publicId/confirm-attendance", async (req, reply) => {
    const { publicId } = req.params as { publicId: string };
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const schedule = await app.prisma.ancSchedule.findFirst({
      where: { publicId, motherId: mother.id, archivedAt: null },
      include: scheduleInclude,
    });

    if (!schedule) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Jadwal ANC tidak ditemukan"));
    }

    if (schedule.status === "COMPLETED") {
      return reply
        .code(400)
        .send(app.fail(req, "ALREADY_COMPLETED", "Pemeriksaan ANC sudah dikonfirmasi sebelumnya"));
    }

    if (schedule.status === "CANCELLED") {
      return reply
        .code(400)
        .send(app.fail(req, "SCHEDULE_CANCELLED", "Jadwal ANC yang telah dibatalkan tidak dapat dikonfirmasi"));
    }

    const now = new Date();

    if (!isAncAppointmentDayArrived(schedule.scheduledAt, now)) {
      return reply.code(400).send(
        app.fail(
          req,
          "PREMATURE_CONFIRMATION",
          "Konfirmasi kehadiran mandiri hanya dapat dilakukan pada atau setelah hari pemeriksaan yang dijadwalkan",
        ),
      );
    }
    const selfReportTag = "[Konfirmasi Kehadiran Mandiri oleh Ibu]";
    const updatedNotes = schedule.notes
      ? (schedule.notes.includes(selfReportTag)
          ? schedule.notes
          : `${schedule.notes}\n${selfReportTag}`)
      : selfReportTag;

    const updated = await app.prisma.ancSchedule.update({
      where: { id: schedule.id },
      data: {
        status: "COMPLETED",
        completedAt: now,
        notes: updatedNotes,
      },
      include: scheduleInclude,
    });

    // Mark related reminders completed
    await app.prisma.reminder.updateMany({
      where: { ancScheduleId: schedule.id, status: { not: "COMPLETED" } },
      data: { status: "COMPLETED", completedAt: now },
    });

    await audit(app.prisma, req, {
      ...actor(req),
      action: "CONFIRM_ANC_ATTENDANCE",
      entityType: "AncSchedule",
      entityId: updated.publicId,
      result: "SUCCESS",
      metadata: {
        completedAt: now.toISOString(),
        source: "MOTHER_SELF_REPORT",
      },
    });

    return reply.send(app.ok(req, ancScheduleView(updated)));
  });

  // 5. GET /api/mother/reminders
  app.get("/reminders", async (req, reply) => {
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const query = req.query as {
      type?: string;
      status?: string;
      page?: string;
      limit?: string;
    };

    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? "20", 10) || 20));

    const where: Prisma.ReminderWhereInput = {
      motherId: mother.id,
      ...(query.type ? { type: query.type as ReminderType } : {}),
      ...(query.status ? { status: query.status as ReminderStatus } : {}),
    };

    const [items, total] = await Promise.all([
      app.prisma.reminder.findMany({
        where,
        orderBy: { scheduledAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: reminderInclude,
      }),
      app.prisma.reminder.count({ where }),
    ]);

    return reply.send(
      app.ok(req, {
        items: items.map(reminderView),
        total,
        page,
        limit,
      }),
    );
  });

  // 6. GET /api/mother/reminder-settings
  app.get("/reminder-settings", async (req, reply) => {
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    let settings = await app.prisma.motherReminderSettings.findUnique({
      where: { motherId: mother.id },
    });

    if (!settings) {
      settings = await app.prisma.motherReminderSettings.create({
        data: {
          motherId: mother.id,
          ironTabletEnabled: true,
          ironTabletTime: "20:00",
          ancReminderEnabled: true,
          ancReminderDaysBefore: 1,
          ancReminderTime: "08:00",
        },
      });
    }

    return reply.send(
      app.ok(req, {
        ironTabletEnabled: settings.ironTabletEnabled,
        ironTabletTime: settings.ironTabletTime,
        ancReminderEnabled: settings.ancReminderEnabled,
        ancReminderDaysBefore: settings.ancReminderDaysBefore,
        ancReminderTime: settings.ancReminderTime,
      }),
    );
  });

  // 7. PATCH /api/mother/reminder-settings
  app.patch("/reminder-settings", async (req, reply) => {
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const parsed = reminderSettingsUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }

    const settings = await app.prisma.motherReminderSettings.upsert({
      where: { motherId: mother.id },
      create: {
        motherId: mother.id,
        ironTabletEnabled: parsed.data.ironTabletEnabled ?? true,
        ironTabletTime: parsed.data.ironTabletTime ?? "20:00",
        ancReminderEnabled: parsed.data.ancReminderEnabled ?? true,
        ancReminderDaysBefore: parsed.data.ancReminderDaysBefore ?? 1,
        ancReminderTime: parsed.data.ancReminderTime ?? "08:00",
      },
      update: {
        ...(parsed.data.ironTabletEnabled !== undefined
          ? { ironTabletEnabled: parsed.data.ironTabletEnabled }
          : {}),
        ...(parsed.data.ironTabletTime !== undefined
          ? { ironTabletTime: parsed.data.ironTabletTime }
          : {}),
        ...(parsed.data.ancReminderEnabled !== undefined
          ? { ancReminderEnabled: parsed.data.ancReminderEnabled }
          : {}),
        ...(parsed.data.ancReminderDaysBefore !== undefined
          ? { ancReminderDaysBefore: parsed.data.ancReminderDaysBefore }
          : {}),
        ...(parsed.data.ancReminderTime !== undefined
          ? { ancReminderTime: parsed.data.ancReminderTime }
          : {}),
      },
    });

    await audit(app.prisma, req, {
      ...actor(req),
      action: "UPDATE_REMINDER_SETTINGS",
      entityType: "MotherReminderSettings",
      entityId: settings.publicId,
      result: "SUCCESS",
    });

    return reply.send(
      app.ok(req, {
        ironTabletEnabled: settings.ironTabletEnabled,
        ironTabletTime: settings.ironTabletTime,
        ancReminderEnabled: settings.ancReminderEnabled,
        ancReminderDaysBefore: settings.ancReminderDaysBefore,
        ancReminderTime: settings.ancReminderTime,
      }),
    );
  });

  // 8. POST /api/mother/reminders/:publicId/complete
  app.post("/reminders/:publicId/complete", async (req, reply) => {
    const { publicId } = req.params as { publicId: string };
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const reminder = await app.prisma.reminder.findFirst({
      where: { publicId, motherId: mother.id },
      include: reminderInclude,
    });

    if (!reminder) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Pengingat tidak ditemukan"));
    }

    const now = new Date();
    const updated = await app.prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        status: "COMPLETED",
        completedAt: now,
      },
      include: reminderInclude,
    });

    await audit(app.prisma, req, {
      ...actor(req),
      action: "COMPLETE_REMINDER",
      entityType: "Reminder",
      entityId: updated.publicId,
      result: "SUCCESS",
      metadata: { type: updated.type, completedAt: now.toISOString() },
    });

    return reply.send(app.ok(req, reminderView(updated)));
  });

  // 9. POST /api/mother/reminders/:publicId/snooze
  app.post("/reminders/:publicId/snooze", async (req, reply) => {
    const { publicId } = req.params as { publicId: string };
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const parsed = reminderSnoozeSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }

    const reminder = await app.prisma.reminder.findFirst({
      where: { publicId, motherId: mother.id },
      include: reminderInclude,
    });

    if (!reminder) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Pengingat tidak ditemukan"));
    }

    const snoozeMinutes = parsed.data.minutes;
    const snoozedUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);

    const updated = await app.prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        status: "SNOOZED",
        snoozedUntil,
        snoozeCount: { increment: 1 },
      },
      include: reminderInclude,
    });

    await audit(app.prisma, req, {
      ...actor(req),
      action: "SNOOZE_REMINDER",
      entityType: "Reminder",
      entityId: updated.publicId,
      result: "SUCCESS",
      metadata: { minutes: snoozeMinutes, snoozedUntil: snoozedUntil.toISOString() },
    });

    return reply.send(app.ok(req, reminderView(updated)));
  });

  // 10. GET /api/mother/adherence-summary
  app.get("/adherence-summary", async (req, reply) => {
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const summary = await calculateAdherenceSummary(app.prisma, mother.id);
    return reply.send(app.ok(req, summary));
  });

  // 11. GET /api/mother/anc-recommendations
  app.get("/anc-recommendations", async (req, reply) => {
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const activePregnancy = await getActivePregnancy(app.prisma, mother.id);

    return reply.send(
      app.ok(req, {
        estimatedDueDate: activePregnancy?.estimatedDueDate?.toISOString() ?? null,
        recommendations: DEFAULT_ANC_RULES.trimesterDistribution,
        ruleSet: DEFAULT_ANC_RULES,
      }),
    );
  });
}

export async function midwifeAncRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MIDWIFE"]));

  // 1. GET /api/midwife/mothers/:motherPublicId/anc-schedules
  app.get("/mothers/:motherPublicId/anc-schedules", async (req, reply) => {
    const { motherPublicId } = req.params as { motherPublicId: string };
    const { mother } = await verifyActiveAssignment(
      app.prisma,
      req.user.sub,
      motherPublicId,
    );

    const query = req.query as {
      status?: string;
      page?: string;
      limit?: string;
      sort?: string;
    };

    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? "50", 10) || 50));
    const sort = query.sort === "desc" ? "desc" : "asc";

    const where: Prisma.AncScheduleWhereInput = {
      motherId: mother.id,
      archivedAt: null,
      ...(query.status && query.status !== "ALL"
        ? { status: query.status as AncVisitStatus }
        : {}),
    };

    const [items, total] = await Promise.all([
      app.prisma.ancSchedule.findMany({
        where,
        orderBy: { scheduledAt: sort },
        skip: (page - 1) * limit,
        take: limit,
        include: scheduleInclude,
      }),
      app.prisma.ancSchedule.count({ where }),
    ]);

    return reply.send(
      app.ok(req, {
        items: items.map(ancScheduleView),
        total,
        page,
        limit,
      }),
    );
  });

  // 2. POST /api/midwife/mothers/:motherPublicId/anc-schedules
  app.post("/mothers/:motherPublicId/anc-schedules", async (req, reply) => {
    const { motherPublicId } = req.params as { motherPublicId: string };
    const { mother } = await verifyActiveAssignment(
      app.prisma,
      req.user.sub,
      motherPublicId,
    );

    const parsed = ancScheduleCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }

    const pregnancy = await getActivePregnancy(app.prisma, mother.id);
    if (!pregnancy) {
      return reply
        .code(400)
        .send(
          app.fail(
            req,
            "NO_ACTIVE_PREGNANCY",
            "Ibu binaan belum memiliki profil kehamilan aktif",
          ),
        );
    }

    let facilityId: string | null = null;
    if (parsed.data.facilityPublicId) {
      const facility = await app.prisma.healthFacility.findFirst({
        where: { publicId: parsed.data.facilityPublicId },
      });
      if (facility) facilityId = facility.id;
    }

    const scheduledDate = new Date(parsed.data.scheduledAt);
    const visitType = parsed.data.visitType ?? "ANC";
    const doctorRequired = parsed.data.doctorRequired ?? (visitType === "DOCTOR_ANC");

    const schedule = await app.prisma.ancSchedule.create({
      data: {
        motherId: mother.id,
        pregnancyId: pregnancy.id,
        scheduledAt: scheduledDate,
        visitType: visitType as AncVisitType,
        doctorRequired,
        status: "SCHEDULED",
        facilityId,
        notes: parsed.data.notes ?? null,
        createdByUserId: req.user.sub,
      },
      include: scheduleInclude,
    });

    // Create automatic reminder for the mother
    await app.prisma.reminder.create({
      data: {
        motherId: mother.id,
        pregnancyId: pregnancy.id,
        ancScheduleId: schedule.id,
        type: "ANC_VISIT",
        scheduledAt: scheduledDate,
        reminderTime: "08:00",
        status: "PENDING",
        notes: parsed.data.notes ?? null,
      },
    });

    await audit(app.prisma, req, {
      ...actor(req),
      action: "CREATE_ANC_SCHEDULE",
      entityType: "AncSchedule",
      entityId: schedule.publicId,
      result: "SUCCESS",
      metadata: {
        motherPublicId,
        scheduledAt: scheduledDate.toISOString(),
        visitType,
        doctorRequired,
      },
    });

    return reply.status(201).send(app.ok(req, ancScheduleView(schedule)));
  });

  // 3. PATCH /api/midwife/mothers/:motherPublicId/anc-schedules/:publicId
  app.patch(
    "/mothers/:motherPublicId/anc-schedules/:publicId",
    async (req, reply) => {
      const { motherPublicId, publicId } = req.params as {
        motherPublicId: string;
        publicId: string;
      };
      const { mother } = await verifyActiveAssignment(
        app.prisma,
        req.user.sub,
        motherPublicId,
      );

      const parsed = ancScheduleUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return invalid(reply, app, req, parsed.error);
      }

      const schedule = await app.prisma.ancSchedule.findFirst({
        where: { publicId, motherId: mother.id, archivedAt: null },
      });

      if (!schedule) {
        return reply
          .code(404)
          .send(app.fail(req, "NOT_FOUND", "Jadwal ANC tidak ditemukan"));
      }

      let facilityId: string | undefined = undefined;
      if (parsed.data.facilityPublicId !== undefined) {
        if (parsed.data.facilityPublicId === null) {
          facilityId = undefined; // handled in data
        } else {
          const fac = await app.prisma.healthFacility.findFirst({
            where: { publicId: parsed.data.facilityPublicId },
          });
          facilityId = fac ? fac.id : undefined;
        }
      }

      const updateData: Prisma.AncScheduleUpdateInput = {
        ...(parsed.data.scheduledAt
          ? { scheduledAt: new Date(parsed.data.scheduledAt) }
          : {}),
        ...(parsed.data.visitType ? { visitType: parsed.data.visitType as AncVisitType } : {}),
        ...(parsed.data.doctorRequired !== undefined
          ? { doctorRequired: parsed.data.doctorRequired }
          : {}),
        ...(parsed.data.status ? { status: parsed.data.status as AncVisitStatus } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
        ...(facilityId !== undefined ? { facility: { connect: { id: facilityId } } } : {}),
      };

      if (parsed.data.status === "COMPLETED" && !schedule.completedAt) {
        updateData.completedAt = new Date();
      }

      const updated = await app.prisma.ancSchedule.update({
        where: { id: schedule.id },
        data: updateData,
        include: scheduleInclude,
      });

      // Update related reminders if date changed
      if (parsed.data.scheduledAt) {
        await app.prisma.reminder.updateMany({
          where: { ancScheduleId: schedule.id, status: "PENDING" },
          data: { scheduledAt: new Date(parsed.data.scheduledAt) },
        });
      }

      await audit(app.prisma, req, {
        ...actor(req),
        action: "UPDATE_ANC_SCHEDULE",
        entityType: "AncSchedule",
        entityId: updated.publicId,
        result: "SUCCESS",
      });

      return reply.send(app.ok(req, ancScheduleView(updated)));
    },
  );

  // 4. GET /api/midwife/mothers/:motherPublicId/adherence-summary
  app.get(
    "/mothers/:motherPublicId/adherence-summary",
    async (req, reply) => {
      const { motherPublicId } = req.params as { motherPublicId: string };
      const { mother } = await verifyActiveAssignment(
        app.prisma,
        req.user.sub,
        motherPublicId,
      );

      const summary = await calculateAdherenceSummary(app.prisma, mother.id);
      return reply.send(app.ok(req, summary));
    },
  );

  // 5. GET /api/midwife/anc-missed
  app.get("/anc-missed", async (req, reply) => {
    const midwife = await app.prisma.midwifeProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!midwife) {
      return reply
        .code(403)
        .send(app.fail(req, "FORBIDDEN", "Profil bidan tidak ditemukan"));
    }

    // Get all active assignments
    const assignments = await app.prisma.motherMidwifeAssignment.findMany({
      where: { midwifeId: midwife.id, status: "ACTIVE" },
      select: { motherId: true },
    });

    const motherIds = assignments.map((a) => a.motherId);
    const now = new Date();

    const missedSchedules = await app.prisma.ancSchedule.findMany({
      where: {
        motherId: { in: motherIds },
        archivedAt: null,
        OR: [
          { status: "MISSED" },
          { status: "SCHEDULED", scheduledAt: { lt: now } },
        ],
      },
      include: {
        mother: { select: { publicId: true, fullName: true } },
        facility: { select: { publicId: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const items = missedSchedules.map((s) => {
      const scheduledTime = s.scheduledAt.getTime();
      const diffMs = Math.max(0, now.getTime() - scheduledTime);
      const daysOverdue = Math.floor(diffMs / (24 * 60 * 60 * 1000));

      return {
        publicId: s.publicId,
        scheduledAt: s.scheduledAt.toISOString(),
        visitType: s.visitType,
        doctorRequired: s.doctorRequired,
        notes: s.notes,
        statusLabel: "Belum Dikonfirmasi",
        daysOverdue,
        mother: {
          publicId: s.mother.publicId,
          fullName: s.mother.fullName,
        },
        facility: s.facility
          ? { publicId: s.facility.publicId, name: s.facility.name }
          : null,
      };
    });

    return reply.send(app.ok(req, { items, total: items.length }));
  });
}

export async function adminAncRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["ADMIN"]));

  // 1. GET /api/admin/anc-rules
  app.get("/anc-rules", async (req, reply) => {
    const rules = await app.prisma.ancRuleSet.findMany({
      orderBy: { effectiveFrom: "desc" },
    });

    if (rules.length === 0) {
      return reply.send(app.ok(req, [DEFAULT_ANC_RULES]));
    }

    return reply.send(
      app.ok(
        req,
        rules.map((r) => ({
          publicId: r.publicId,
          version: r.version,
          active: r.active,
          effectiveFrom: r.effectiveFrom.toISOString(),
          minimumVisits: r.minimumVisits,
          minimumDoctorVisits: r.minimumDoctorVisits,
          trimesterDistribution: r.trimesterDistribution,
          sourceReference: r.sourceReference,
        })),
      ),
    );
  });

  // 2. POST /api/admin/anc-rules
  app.post("/anc-rules", async (req, reply) => {
    const body = (req.body ?? {}) as {
      version?: string;
      active?: boolean;
      effectiveFrom?: string;
      minimumVisits?: number;
      minimumDoctorVisits?: number;
      trimesterDistribution?: Prisma.InputJsonValue;
      sourceReference?: string;
    };
    const rule = await app.prisma.ancRuleSet.create({
      data: {
        version: body.version ?? `KEMENKES-${Date.now()}`,
        active: body.active ?? true,
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
        minimumVisits: body.minimumVisits ?? 6,
        minimumDoctorVisits: body.minimumDoctorVisits ?? 2,
        trimesterDistribution: (body.trimesterDistribution ??
          DEFAULT_ANC_RULES.trimesterDistribution) as unknown as Prisma.InputJsonValue,
        sourceReference: (body.sourceReference ?? DEFAULT_ANC_RULES.sourceReference) ?? null,
      },
    });

    return reply.status(201).send(
      app.ok(req, {
        publicId: rule.publicId,
        version: rule.version,
        active: rule.active,
        effectiveFrom: rule.effectiveFrom.toISOString(),
        minimumVisits: rule.minimumVisits,
        minimumDoctorVisits: rule.minimumDoctorVisits,
        trimesterDistribution: rule.trimesterDistribution,
        sourceReference: rule.sourceReference,
      }),
    );
  });
}
