import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  dangerFollowUpUpdateSchema,
  dangerScreeningCreateSchema,
} from "@pfram/validation";
import { audit } from "../auth/service.js";
import { verifyActiveAssignment } from "../monitoring/service.js";
import {
  calculateMotherGestation,
  dangerFollowUpListItemView,
  dangerScreeningView,
  evaluateResponses,
  getActiveRuleSet,
  screeningInclude,
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

export async function motherDangerScreeningRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MOTHER"]));

  // 1. GET /api/mother/danger-signs
  app.get("/danger-signs", async (req, reply) => {
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
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const activePregnancy = mother.pregnancies[0];
    let trimester: number | undefined = undefined;
    let gestationInfo = null;

    if (activePregnancy) {
      const g = calculateMotherGestation(activePregnancy);
      trimester = g.trimester;
      gestationInfo = {
        gestationalAge: g.gestationalAge
          ? { weeks: g.gestationalAge.weeks, days: g.gestationalAge.days }
          : null,
        trimester: g.trimester,
      };
    }

    const { ruleSet, rules } = await getActiveRuleSet(app.prisma, trimester);

    return reply.send(
      app.ok(req, {
        ruleSet,
        rules,
        pregnancy: gestationInfo,
      }),
    );
  });

  // 2. POST /api/mother/danger-screenings
  app.post("/danger-screenings", async (req, reply) => {
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
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const activePregnancy = mother.pregnancies[0];
    if (!activePregnancy) {
      return reply
        .code(400)
        .send(
          app.fail(
            req,
            "NO_ACTIVE_PREGNANCY",
            "Ibu belum memiliki kehamilan aktif untuk melakukan skrining",
          ),
        );
    }

    const parsed = dangerScreeningCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }

    const { trimester } = calculateMotherGestation(activePregnancy);
    const { ruleSet, rules } = await getActiveRuleSet(app.prisma, trimester);

    if (parsed.data.ruleSetVersion !== ruleSet.version) {
      return reply
        .code(400)
        .send(
          app.fail(
            req,
            "INVALID_RULE_VERSION",
            `Versi aturan tidak sesuai. Versi aktif sistem saat ini adalah ${ruleSet.version}`,
          ),
        );
    }

    const evaluation = evaluateResponses(rules, parsed.data.responses);

    const now = new Date();

    const created = await app.prisma.$transaction(async (tx) => {
      const screening = await tx.dangerScreening.create({
        data: {
          motherId: mother.id,
          pregnancyId: activePregnancy.id,
          ruleSetVersion: ruleSet.version,
          screenedAt: now,
          status: evaluation.status,
          reportedSignsCount: evaluation.reportedCount,
          summary: evaluation.summary,
          followUpStatus: "PENDING",
          createdByUserId: req.user.sub,
        },
      });

      if (evaluation.evaluatedResponses.length > 0) {
        await tx.dangerScreeningResponse.createMany({
          data: evaluation.evaluatedResponses.map((r) => ({
            screeningId: screening.id,
            ruleCode: r.ruleCode,
            title: r.title,
            question: r.question,
            answer: r.answer,
            severityCategory: r.severityCategory,
            createdAt: now,
          })),
        });
      }

      return tx.dangerScreening.findUniqueOrThrow({
        where: { id: screening.id },
        include: screeningInclude,
      });
    });

    await audit(app.prisma, req, {
      ...actor(req),
      action: "DANGER_SCREENING_CREATED",
      entityType: "DangerScreening",
      entityId: created.publicId,
      result: "SUCCESS",
      metadata: {
        status: created.status,
        reportedSignsCount: created.reportedSignsCount,
        ruleSetVersion: ruleSet.version,
      },
    });

    return reply.status(201).send(app.ok(req, dangerScreeningView(created)));
  });

  // 3. GET /api/mother/danger-screenings
  app.get("/danger-screenings", async (req, reply) => {
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });

    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const query = req.query as { page?: string; limit?: string };
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? "20", 10) || 20));

    const where: Prisma.DangerScreeningWhereInput = {
      motherId: mother.id,
      archivedAt: null,
    };

    const [items, total] = await Promise.all([
      app.prisma.dangerScreening.findMany({
        where,
        orderBy: { screenedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: screeningInclude,
      }),
      app.prisma.dangerScreening.count({ where }),
    ]);

    return reply.send(
      app.ok(req, {
        items: items.map(dangerScreeningView),
        total,
        page,
        limit,
      }),
    );
  });

  // 4. GET /api/mother/danger-screenings/:publicId
  app.get("/danger-screenings/:publicId", async (req, reply) => {
    const { publicId } = req.params as { publicId: string };
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });

    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    const screening = await app.prisma.dangerScreening.findFirst({
      where: {
        publicId,
        motherId: mother.id,
        archivedAt: null,
      },
      include: screeningInclude,
    });

    if (!screening) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Data skrining tidak ditemukan"));
    }

    return reply.send(app.ok(req, dangerScreeningView(screening)));
  });
}

export async function midwifeDangerScreeningRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MIDWIFE"]));

  // 1. GET /api/midwife/mothers/:motherPublicId/danger-screenings
  app.get("/mothers/:motherPublicId/danger-screenings", async (req, reply) => {
    const { motherPublicId } = req.params as { motherPublicId: string };
    const { mother } = await verifyActiveAssignment(
      app.prisma,
      req.user.sub,
      motherPublicId,
    );

    const query = req.query as { page?: string; limit?: string };
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? "20", 10) || 20));

    const where: Prisma.DangerScreeningWhereInput = {
      motherId: mother.id,
      archivedAt: null,
    };

    const [items, total] = await Promise.all([
      app.prisma.dangerScreening.findMany({
        where,
        orderBy: { screenedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: screeningInclude,
      }),
      app.prisma.dangerScreening.count({ where }),
    ]);

    return reply.send(
      app.ok(req, {
        items: items.map(dangerScreeningView),
        total,
        page,
        limit,
      }),
    );
  });

  // 2. GET /api/midwife/mothers/:motherPublicId/danger-screenings/:publicId
  app.get(
    "/mothers/:motherPublicId/danger-screenings/:publicId",
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

      const screening = await app.prisma.dangerScreening.findFirst({
        where: {
          publicId,
          motherId: mother.id,
          archivedAt: null,
        },
        include: screeningInclude,
      });

      if (!screening) {
        return reply
          .code(404)
          .send(app.fail(req, "NOT_FOUND", "Data skrining tidak ditemukan"));
      }

      await audit(app.prisma, req, {
        ...actor(req),
        action: "DANGER_SCREENING_VIEWED_BY_MIDWIFE",
        entityType: "DangerScreening",
        entityId: screening.publicId,
        result: "SUCCESS",
        metadata: { motherPublicId },
      });

      return reply.send(app.ok(req, dangerScreeningView(screening)));
    },
  );

  // 3. GET /api/midwife/danger-follow-ups
  app.get("/danger-follow-ups", async (req, reply) => {
    const midwife = await app.prisma.midwifeProfile.findUnique({
      where: { userId: req.user.sub },
    });

    if (!midwife || !midwife.active) {
      return reply
        .code(403)
        .send(app.fail(req, "FORBIDDEN", "Profil bidan tidak aktif"));
    }

    const assignments = await app.prisma.motherMidwifeAssignment.findMany({
      where: { midwifeId: midwife.id, status: "ACTIVE" },
      select: { motherId: true },
    });

    const motherIds = assignments.map((a) => a.motherId);

    const screenings = await app.prisma.dangerScreening.findMany({
      where: {
        motherId: { in: motherIds },
        archivedAt: null,
        pregnancy: { status: "ACTIVE" },
        status: { in: ["DANGER_SIGN_REPORTED", "REQUIRES_IMMEDIATE_CARE"] },
        followUpStatus: { not: "RESOLVED" },
      },
      include: {
        mother: {
          select: {
            publicId: true,
            fullName: true,
            user: { select: { phoneNumber: true } },
            primaryFacility: { select: { publicId: true, name: true } },
          },
        },
        pregnancy: {
          select: {
            gestationalAgeSource: true,
            lastMenstrualPeriod: true,
            assessmentDate: true,
            initialGestationalAgeWeeks: true,
            initialGestationalAgeDays: true,
          },
        },
        responses: {
          select: {
            title: true,
            answer: true,
          },
        },
      },
      orderBy: { screenedAt: "desc" },
    });

    return reply.send(
      app.ok(req, {
        items: screenings.map(dangerFollowUpListItemView),
        total: screenings.length,
      }),
    );
  });

  // 4. PATCH /api/midwife/danger-screenings/:publicId/follow-up
  app.patch("/danger-screenings/:publicId/follow-up", async (req, reply) => {
    const { publicId } = req.params as { publicId: string };

    const parsed = dangerFollowUpUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }

    const screening = await app.prisma.dangerScreening.findUnique({
      where: { publicId },
      include: {
        mother: { select: { publicId: true } },
      },
    });

    if (!screening || screening.archivedAt !== null) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Data skrining tidak ditemukan"));
    }

    // Verify active assignment
    await verifyActiveAssignment(
      app.prisma,
      req.user.sub,
      screening.mother.publicId,
    );

    const updated = await app.prisma.dangerScreening.update({
      where: { id: screening.id },
      data: {
        followUpStatus: parsed.data.status,
        ...(parsed.data.notes !== undefined
          ? { followUpNotes: parsed.data.notes }
          : {}),
        followUpUpdatedAt: new Date(),
        followedUpByUserId: req.user.sub,
      },
      include: screeningInclude,
    });

    await audit(app.prisma, req, {
      ...actor(req),
      action: "DANGER_FOLLOWUP_UPDATED",
      entityType: "DangerScreening",
      entityId: updated.publicId,
      result: "SUCCESS",
      metadata: {
        newStatus: parsed.data.status,
        notesUpdated: parsed.data.notes !== undefined,
      },
    });

    return reply.send(app.ok(req, dangerScreeningView(updated)));
  });
}

export async function adminDangerScreeningRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["ADMIN"]));

  // 1. GET /api/admin/danger-rules
  app.get("/danger-rules", async (req, reply) => {
    const ruleSets = await app.prisma.dangerSignRuleSet.findMany({
      include: {
        rules: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { effectiveFrom: "desc" },
    });

    return reply.send(app.ok(req, ruleSets));
  });
}
