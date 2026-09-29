import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  monitoringCreateSchema,
  monitoringUpdateSchema,
  monitoringQuerySchema,
} from "@pfram/validation";
import { audit } from "../auth/service.js";
import {
  calculateMonitoringSummary,
  monitoringEntryView,
  monitoringListItemView,
  verifyActiveAssignment,
  type MonitoringEntryRecord,
} from "./service.js";

const invalid = (
  reply: FastifyReply,
  app: FastifyInstance,
  req: FastifyRequest,
  error: z.ZodError,
) =>
  reply
    .code(400)
    .send(
      app.fail(req, "VALIDATION_ERROR", "Data tidak valid", error.flatten()),
    );

const actor = (req: FastifyRequest) => ({
  actorUserId: req.user.sub,
  actorRole: req.user.role,
});

const routeParams = (req: FastifyRequest) =>
  req.params as {
    publicId: string;
    motherPublicId: string;
  };

const entryInclude = {
  mother: { select: { publicId: true } },
  pregnancy: { select: { publicId: true } },
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

export async function motherMonitoringRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MOTHER"]));

  // GET /api/mother/monitoring
  app.get("/monitoring", async (req, reply) => {
    const parsedQuery = monitoringQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) return invalid(reply, app, req, parsedQuery.error);
    const q = parsedQuery.data;

    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "PROFILE_NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const where: Prisma.MonitoringEntryWhereInput = {
      motherId: mother.id,
      archivedAt: null,
    };

    if (q.pregnancyPublicId) {
      const pregnancy = await app.prisma.pregnancy.findUnique({
        where: { publicId: q.pregnancyPublicId },
      });
      if (pregnancy && pregnancy.motherId === mother.id) {
        where.pregnancyId = pregnancy.id;
      } else {
        return app.ok(req, {
          items: [],
          total: 0,
          page: q.page,
          pageSize: q.limit,
        });
      }
    }

    if (q.from || q.to) {
      where.recordedAt = {};
      if (q.from) where.recordedAt.gte = new Date(q.from);
      if (q.to) where.recordedAt.lte = new Date(q.to);
    }

    if (q.type === "weight") {
      where.weightKg = { not: null };
    } else if (q.type === "blood_pressure") {
      where.systolicBp = { not: null };
    } else if (q.type === "both") {
      where.weightKg = { not: null };
      where.systolicBp = { not: null };
    }

    const [rows, total] = await Promise.all([
      app.prisma.monitoringEntry.findMany({
        where,
        include: entryInclude,
        orderBy: { recordedAt: q.sort },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      app.prisma.monitoringEntry.count({ where }),
    ]);

    return app.ok(req, {
      items: (rows as unknown as MonitoringEntryRecord[]).map(monitoringListItemView),
      total,
      page: q.page,
      pageSize: q.limit,
    });
  });

  // GET /api/mother/monitoring/summary
  app.get("/monitoring/summary", async (req, reply) => {
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
      include: {
        pregnancies: {
          where: { status: "ACTIVE" },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "PROFILE_NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const activePregnancy = mother.pregnancies[0] ?? null;
    const entries = activePregnancy
      ? await app.prisma.monitoringEntry.findMany({
          where: {
            motherId: mother.id,
            pregnancyId: activePregnancy.id,
            archivedAt: null,
          },
          select: {
            weightKg: true,
            systolicBp: true,
            diastolicBp: true,
            recordedAt: true,
          },
          orderBy: { recordedAt: "desc" },
        })
      : [];

    const summary = calculateMonitoringSummary(
      entries,
      activePregnancy?.publicId ?? null,
    );
    return app.ok(req, summary);
  });

  // GET /api/mother/monitoring/:publicId
  app.get("/monitoring/:publicId", async (req, reply) => {
    const { publicId } = routeParams(req);
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "PROFILE_NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const entry = await app.prisma.monitoringEntry.findUnique({
      where: { publicId },
      include: entryInclude,
    });

    if (!entry || entry.motherId !== mother.id) {
      return reply
        .code(404)
        .send(
          app.fail(
            req,
            "MONITORING_NOT_FOUND",
            "Catatan pemantauan tidak ditemukan",
          ),
        );
    }

    return app.ok(
      req,
      monitoringEntryView(entry as unknown as MonitoringEntryRecord),
    );
  });

  // POST /api/mother/monitoring
  app.post("/monitoring", async (req, reply) => {
    const parsed = monitoringCreateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const v = parsed.data;

    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
      include: {
        pregnancies: {
          where: { status: "ACTIVE" },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "PROFILE_NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const entry = await app.prisma.$transaction(async (tx) => {
      let pregnancy = mother.pregnancies[0];
      if (v.pregnancyPublicId) {
        pregnancy =
          (await tx.pregnancy.findFirst({
            where: {
              publicId: v.pregnancyPublicId,
              motherId: mother.id,
              status: "ACTIVE",
            },
          })) ?? undefined;
      }

      if (!pregnancy || pregnancy.status !== "ACTIVE") {
        throw Object.assign(
          new Error("Tidak ada kehamilan aktif yang valid untuk pemantauan ini"),
          { statusCode: 400, code: "NO_ACTIVE_PREGNANCY" },
        );
      }

      const row = await tx.monitoringEntry.create({
        data: {
          motherId: mother.id,
          pregnancyId: pregnancy.id,
          recordedAt: v.recordedAt ? new Date(v.recordedAt) : new Date(),
          source: v.source ?? "SELF",
          weightKg: v.weightKg !== undefined ? v.weightKg : null,
          systolicBp: v.systolicBp !== undefined ? v.systolicBp : null,
          diastolicBp: v.diastolicBp !== undefined ? v.diastolicBp : null,
          notes: v.notes ?? null,
          createdByUserId: req.user.sub,
        },
        include: entryInclude,
      });

      return { row, pregnancy };
    });

    await audit(app.prisma, req, {
      ...actor(req),
      action: "MONITORING_CREATED",
      result: "SUCCESS",
      entityType: "MonitoringEntry",
      entityId: entry.row.publicId,
      metadata: {
        monitoringPublicId: entry.row.publicId,
        motherPublicId: mother.publicId,
        pregnancyPublicId: entry.pregnancy.publicId,
        actorRole: req.user.role,
        source: entry.row.source,
        hasWeight: v.weightKg !== undefined,
        hasBp: v.systolicBp !== undefined,
      },
    });

    return reply
      .code(201)
      .send(
        app.ok(
          req,
          monitoringEntryView(entry.row as unknown as MonitoringEntryRecord),
        ),
      );
  });

  // PATCH /api/mother/monitoring/:publicId
  app.patch("/monitoring/:publicId", async (req, reply) => {
    const { publicId } = routeParams(req);
    const parsed = monitoringUpdateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const v = parsed.data;

    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "PROFILE_NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const existing = await app.prisma.monitoringEntry.findUnique({
      where: { publicId },
      include: { pregnancy: true },
    });

    if (!existing || existing.motherId !== mother.id) {
      return reply
        .code(404)
        .send(
          app.fail(
            req,
            "MONITORING_NOT_FOUND",
            "Catatan pemantauan tidak ditemukan",
          ),
        );
    }

    if (existing.archivedAt) {
      return reply
        .code(409)
        .send(
          app.fail(
            req,
            "MONITORING_ARCHIVED",
            "Catatan pemantauan yang telah diarsipkan tidak dapat diubah",
          ),
        );
    }

    // Determine final values after update
    const finalWeight =
      v.weightKg !== undefined
        ? v.weightKg
        : existing.weightKg !== null
          ? Number(existing.weightKg)
          : null;
    const finalSystolic =
      v.systolicBp !== undefined ? v.systolicBp : existing.systolicBp;
    const finalDiastolic =
      v.diastolicBp !== undefined ? v.diastolicBp : existing.diastolicBp;

    const hasWeight = finalWeight !== null && finalWeight !== undefined;
    const hasSystolic = finalSystolic !== null && finalSystolic !== undefined;
    const hasDiastolic = finalDiastolic !== null && finalDiastolic !== undefined;

    if (!hasWeight && !hasSystolic && !hasDiastolic) {
      return reply
        .code(400)
        .send(
          app.fail(
            req,
            "VALIDATION_ERROR",
            "Catatan monitoring tidak boleh menjadi kosong",
          ),
        );
    }

    if ((hasSystolic && !hasDiastolic) || (!hasSystolic && hasDiastolic)) {
      return reply
        .code(400)
        .send(
          app.fail(
            req,
            "VALIDATION_ERROR",
            "Tekanan darah sistolik dan diastolik harus berpasangan",
          ),
        );
    }

    if (hasSystolic && hasDiastolic && finalSystolic! <= finalDiastolic!) {
      return reply
        .code(400)
        .send(
          app.fail(
            req,
            "VALIDATION_ERROR",
            "Tekanan sistolik harus lebih besar dari diastolik",
          ),
        );
    }

    const updated = await app.prisma.monitoringEntry.update({
      where: { id: existing.id },
      data: {
        ...(v.recordedAt ? { recordedAt: new Date(v.recordedAt) } : {}),
        ...(v.source ? { source: v.source } : {}),
        ...(v.weightKg !== undefined ? { weightKg: v.weightKg } : {}),
        ...(v.systolicBp !== undefined ? { systolicBp: v.systolicBp } : {}),
        ...(v.diastolicBp !== undefined ? { diastolicBp: v.diastolicBp } : {}),
        ...(v.notes !== undefined ? { notes: v.notes } : {}),
      },
      include: entryInclude,
    });

    await audit(app.prisma, req, {
      ...actor(req),
      action: "MONITORING_UPDATED",
      result: "SUCCESS",
      entityType: "MonitoringEntry",
      entityId: updated.publicId,
      metadata: {
        monitoringPublicId: updated.publicId,
        motherPublicId: mother.publicId,
        pregnancyPublicId: existing.pregnancy.publicId,
        actorRole: req.user.role,
        changedFields: Object.keys(v),
      },
    });

    return app.ok(
      req,
      monitoringEntryView(updated as unknown as MonitoringEntryRecord),
    );
  });

  // POST /api/mother/monitoring/:publicId/archive
  app.post("/monitoring/:publicId/archive", async (req, reply) => {
    const { publicId } = routeParams(req);
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "PROFILE_NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const existing = await app.prisma.monitoringEntry.findUnique({
      where: { publicId },
      include: { pregnancy: true },
    });

    if (!existing || existing.motherId !== mother.id) {
      return reply
        .code(404)
        .send(
          app.fail(
            req,
            "MONITORING_NOT_FOUND",
            "Catatan pemantauan tidak ditemukan",
          ),
        );
    }

    const archived = await app.prisma.monitoringEntry.update({
      where: { id: existing.id },
      data: { archivedAt: new Date() },
    });

    await audit(app.prisma, req, {
      ...actor(req),
      action: "MONITORING_ARCHIVED",
      result: "SUCCESS",
      entityType: "MonitoringEntry",
      entityId: archived.publicId,
      metadata: {
        monitoringPublicId: archived.publicId,
        motherPublicId: mother.publicId,
        pregnancyPublicId: existing.pregnancy.publicId,
        actorRole: req.user.role,
      },
    });

    return app.ok(req, {
      publicId: archived.publicId,
      archivedAt: archived.archivedAt?.toISOString() ?? null,
    });
  });
}

export async function midwifeMonitoringRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MIDWIFE"]));

  // GET /api/midwife/mothers/:motherPublicId/monitoring
  app.get("/mothers/:motherPublicId/monitoring", async (req, reply) => {
    const { motherPublicId } = routeParams(req);
    const parsedQuery = monitoringQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) return invalid(reply, app, req, parsedQuery.error);
    const q = parsedQuery.data;

    const { mother } = await verifyActiveAssignment(
      app.prisma,
      req.user.sub,
      motherPublicId,
    );

    const where: Prisma.MonitoringEntryWhereInput = {
      motherId: mother.id,
      archivedAt: null,
    };

    if (q.pregnancyPublicId) {
      const pregnancy = await app.prisma.pregnancy.findUnique({
        where: { publicId: q.pregnancyPublicId },
      });
      if (pregnancy && pregnancy.motherId === mother.id) {
        where.pregnancyId = pregnancy.id;
      } else {
        return app.ok(req, {
          items: [],
          total: 0,
          page: q.page,
          pageSize: q.limit,
        });
      }
    }

    if (q.from || q.to) {
      where.recordedAt = {};
      if (q.from) where.recordedAt.gte = new Date(q.from);
      if (q.to) where.recordedAt.lte = new Date(q.to);
    }

    if (q.type === "weight") {
      where.weightKg = { not: null };
    } else if (q.type === "blood_pressure") {
      where.systolicBp = { not: null };
    } else if (q.type === "both") {
      where.weightKg = { not: null };
      where.systolicBp = { not: null };
    }

    const [rows, total] = await Promise.all([
      app.prisma.monitoringEntry.findMany({
        where,
        include: entryInclude,
        orderBy: { recordedAt: q.sort },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      app.prisma.monitoringEntry.count({ where }),
    ]);

    await audit(app.prisma, req, {
      ...actor(req),
      action: "MONITORING_VIEWED_BY_MIDWIFE",
      result: "SUCCESS",
      entityType: "MotherProfile",
      entityId: mother.publicId,
      metadata: {
        motherPublicId: mother.publicId,
        actorRole: req.user.role,
        entryCount: rows.length,
      },
    });

    return app.ok(req, {
      items: (rows as unknown as MonitoringEntryRecord[]).map(monitoringListItemView),
      total,
      page: q.page,
      pageSize: q.limit,
    });
  });

  // GET /api/midwife/mothers/:motherPublicId/monitoring/summary
  app.get("/mothers/:motherPublicId/monitoring/summary", async (req) => {
    const { motherPublicId } = routeParams(req);
    const { mother } = await verifyActiveAssignment(
      app.prisma,
      req.user.sub,
      motherPublicId,
    );

    const activePregnancy = mother.pregnancies[0] ?? null;
    const entries = activePregnancy
      ? await app.prisma.monitoringEntry.findMany({
          where: {
            motherId: mother.id,
            pregnancyId: activePregnancy.id,
            archivedAt: null,
          },
          select: {
            weightKg: true,
            systolicBp: true,
            diastolicBp: true,
            recordedAt: true,
          },
          orderBy: { recordedAt: "desc" },
        })
      : [];

    const summary = calculateMonitoringSummary(
      entries,
      activePregnancy?.publicId ?? null,
    );
    return app.ok(req, summary);
  });

  // GET /api/midwife/mothers/:motherPublicId/monitoring/:publicId
  app.get("/mothers/:motherPublicId/monitoring/:publicId", async (req, reply) => {
    const { motherPublicId, publicId } = routeParams(req);
    const { mother } = await verifyActiveAssignment(
      app.prisma,
      req.user.sub,
      motherPublicId,
    );

    const entry = await app.prisma.monitoringEntry.findUnique({
      where: { publicId },
      include: entryInclude,
    });

    if (!entry || entry.motherId !== mother.id) {
      return reply
        .code(404)
        .send(
          app.fail(
            req,
            "MONITORING_NOT_FOUND",
            "Catatan pemantauan tidak ditemukan",
          ),
        );
    }

    await audit(app.prisma, req, {
      ...actor(req),
      action: "MONITORING_VIEWED_BY_MIDWIFE",
      result: "SUCCESS",
      entityType: "MonitoringEntry",
      entityId: entry.publicId,
      metadata: {
        monitoringPublicId: entry.publicId,
        motherPublicId: mother.publicId,
        actorRole: req.user.role,
      },
    });

    return app.ok(
      req,
      monitoringEntryView(entry as unknown as MonitoringEntryRecord),
    );
  });

  // POST /api/midwife/mothers/:motherPublicId/monitoring
  app.post("/mothers/:motherPublicId/monitoring", async (req, reply) => {
    const { motherPublicId } = routeParams(req);
    const { mother } = await verifyActiveAssignment(
      app.prisma,
      req.user.sub,
      motherPublicId,
    );

    const parsed = monitoringCreateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const v = parsed.data;

    const entry = await app.prisma.$transaction(async (tx) => {
      let pregnancy = mother.pregnancies[0];
      if (v.pregnancyPublicId) {
        pregnancy =
          (await tx.pregnancy.findFirst({
            where: {
              publicId: v.pregnancyPublicId,
              motherId: mother.id,
              status: "ACTIVE",
            },
          })) ?? undefined;
      }

      if (!pregnancy || pregnancy.status !== "ACTIVE") {
        throw Object.assign(
          new Error("Tidak ada kehamilan aktif yang valid untuk pemantauan ini"),
          { statusCode: 400, code: "NO_ACTIVE_PREGNANCY" },
        );
      }

      const row = await tx.monitoringEntry.create({
        data: {
          motherId: mother.id,
          pregnancyId: pregnancy.id,
          recordedAt: v.recordedAt ? new Date(v.recordedAt) : new Date(),
          source: v.source ?? "MIDWIFE",
          weightKg: v.weightKg !== undefined ? v.weightKg : null,
          systolicBp: v.systolicBp !== undefined ? v.systolicBp : null,
          diastolicBp: v.diastolicBp !== undefined ? v.diastolicBp : null,
          notes: v.notes ?? null,
          createdByUserId: req.user.sub,
        },
        include: entryInclude,
      });

      return { row, pregnancy };
    });

    await audit(app.prisma, req, {
      ...actor(req),
      action: "MONITORING_CREATED",
      result: "SUCCESS",
      entityType: "MonitoringEntry",
      entityId: entry.row.publicId,
      metadata: {
        monitoringPublicId: entry.row.publicId,
        motherPublicId: mother.publicId,
        pregnancyPublicId: entry.pregnancy.publicId,
        actorRole: req.user.role,
        source: entry.row.source,
        hasWeight: v.weightKg !== undefined,
        hasBp: v.systolicBp !== undefined,
      },
    });

    return reply
      .code(201)
      .send(
        app.ok(
          req,
          monitoringEntryView(entry.row as unknown as MonitoringEntryRecord),
        ),
      );
  });
}
