import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  homeVisitCreateSchema,
  homeVisitQuerySchema,
  homeVisitUpdateSchema,
  midwifeMotherQuerySchema,
} from "@pfram/validation";
import { audit } from "../auth/service.js";
import {
  createMidwifeHomeVisit,
  getMidwifeDashboardAttention,
  getMidwifeDashboardSummary,
  getMidwifeEnrichedMothers,
  getMidwifeTodaySchedule,
  listMidwifeHomeVisits,
  listMotherHomeVisits,
  updateMidwifeHomeVisit,
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

export async function midwifeDashboardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MIDWIFE"]));

  // 1. GET /api/midwife/dashboard/summary
  app.get("/dashboard/summary", async (req, reply) => {
    const summary = await getMidwifeDashboardSummary(app.prisma, req.user.sub);
    return reply.send(app.ok(req, summary));
  });

  // 2. GET /api/midwife/dashboard/attention
  app.get("/dashboard/attention", async (req, reply) => {
    const items = await getMidwifeDashboardAttention(app.prisma, req.user.sub);
    return reply.send(app.ok(req, { items, total: items.length }));
  });

  // 3. GET /api/midwife/dashboard/schedule/today
  app.get("/dashboard/schedule/today", async (req, reply) => {
    const items = await getMidwifeTodaySchedule(app.prisma, req.user.sub);
    return reply.send(app.ok(req, { items, total: items.length }));
  });

  // 4. GET /api/midwife/dashboard/mothers
  app.get("/dashboard/mothers", async (req, reply) => {
    const parsed = midwifeMotherQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }
    const result = await getMidwifeEnrichedMothers(
      app.prisma,
      req.user.sub,
      parsed.data,
    );
    return reply.send(app.ok(req, result));
  });

  // 5. GET /api/midwife/home-visits
  app.get("/home-visits", async (req, reply) => {
    const parsed = homeVisitQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }
    const result = await listMidwifeHomeVisits(
      app.prisma,
      req.user.sub,
      parsed.data,
    );
    return reply.send(app.ok(req, result));
  });

  // 6. POST /api/midwife/home-visits
  app.post("/home-visits", async (req, reply) => {
    const parsed = homeVisitCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }
    const visit = await createMidwifeHomeVisit(
      app.prisma,
      req.user.sub,
      parsed.data,
    );

    await audit(app.prisma, req, {
      ...actor(req),
      action: "HOME_VISIT_SCHEDULED",
      entityType: "HomeVisitSchedule",
      entityId: visit.publicId,
      result: "SUCCESS",
      metadata: { motherPublicId: visit.motherPublicId },
    });

    return reply.code(201).send(app.ok(req, visit));
  });

  // 7. PATCH /api/midwife/home-visits/:publicId
  app.patch("/home-visits/:publicId", async (req, reply) => {
    const { publicId } = req.params as { publicId: string };
    const parsed = homeVisitUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }

    const updated = await updateMidwifeHomeVisit(
      app.prisma,
      req.user.sub,
      publicId,
      parsed.data,
    );

    await audit(app.prisma, req, {
      ...actor(req),
      action: "HOME_VISIT_UPDATED",
      entityType: "HomeVisitSchedule",
      entityId: updated.publicId,
      result: "SUCCESS",
      metadata: { status: updated.status },
    });

    return reply.send(app.ok(req, updated));
  });
}

export async function motherHomeVisitRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MOTHER"]));

  // 1. GET /api/mother/home-visits
  app.get("/home-visits", async (req, reply) => {
    const parsed = homeVisitQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }
    const result = await listMotherHomeVisits(
      app.prisma,
      req.user.sub,
      parsed.data,
    );
    return reply.send(app.ok(req, result));
  });
}
