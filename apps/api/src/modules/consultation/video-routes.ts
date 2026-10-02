import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  videoConsultationCreateSchema,
  videoConsultationQuerySchema,
  videoConsultationStatusUpdateSchema,
  videoConsultationUpdateSchema,
} from "@pfram/validation";
import { audit } from "../auth/service.js";
import { ConsultationError } from "./service.js";
import {
  createMidwifeVideoConsultation,
  getMotherUpcomingVideo,
  listMidwifeVideoConsultations,
  listMotherVideoConsultations,
  updateMidwifeVideoConsultation,
  updateMidwifeVideoStatus,
} from "./video-service.js";

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

export async function motherVideoConsultationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MOTHER"]));

  // 1. GET /api/mother/video-consultations/upcoming
  app.get("/upcoming", async (req, reply) => {
    try {
      const upcoming = await getMotherUpcomingVideo(app.prisma, req.user.sub);
      return reply.code(200).send(app.ok(req, upcoming));
    } catch (err) {
      if (err instanceof ConsultationError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 2. GET /api/mother/video-consultations
  app.get("/", async (req, reply) => {
    const parse = videoConsultationQuerySchema.safeParse(req.query);
    if (!parse.success) return invalid(reply, app, req, parse.error);

    try {
      const result = await listMotherVideoConsultations(
        app.prisma,
        req.user.sub,
        parse.data,
      );
      return reply.code(200).send(app.ok(req, result));
    } catch (err) {
      if (err instanceof ConsultationError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });
}

export async function midwifeVideoConsultationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MIDWIFE"]));

  // 1. GET /api/midwife/video-consultations
  app.get("/", async (req, reply) => {
    const parse = videoConsultationQuerySchema.safeParse(req.query);
    if (!parse.success) return invalid(reply, app, req, parse.error);

    try {
      const result = await listMidwifeVideoConsultations(
        app.prisma,
        req.user.sub,
        parse.data,
      );
      return reply.code(200).send(app.ok(req, result));
    } catch (err) {
      if (err instanceof ConsultationError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 2. POST /api/midwife/video-consultations
  app.post("/", async (req, reply) => {
    const parse = videoConsultationCreateSchema.safeParse(req.body);
    if (!parse.success) return invalid(reply, app, req, parse.error);

    try {
      const created = await createMidwifeVideoConsultation(
        app.prisma,
        req.user.sub,
        parse.data,
      );

      await audit(app.prisma, req, {
        ...actor(req),
        action: "CREATE_VIDEO_CONSULTATION",
        result: "SUCCESS",
        entityType: "VideoConsultation",
        entityId: created.publicId,
        metadata: {
          motherPublicId: created.motherPublicId,
          scheduledAt: created.scheduledAt,
          status: created.status,
        },
      });

      return reply.code(201).send(app.ok(req, created));
    } catch (err) {
      if (err instanceof ConsultationError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 3. PATCH /api/midwife/video-consultations/:publicId
  app.patch("/:publicId", async (req, reply) => {
    const { publicId } = req.params as { publicId: string };
    const parse = videoConsultationUpdateSchema.safeParse(req.body);
    if (!parse.success) return invalid(reply, app, req, parse.error);

    try {
      const updated = await updateMidwifeVideoConsultation(
        app.prisma,
        req.user.sub,
        publicId,
        parse.data,
      );

      await audit(app.prisma, req, {
        ...actor(req),
        action: "UPDATE_VIDEO_CONSULTATION",
        result: "SUCCESS",
        entityType: "VideoConsultation",
        entityId: updated.publicId,
        metadata: {
          status: updated.status,
          scheduledAt: updated.scheduledAt,
        },
      });

      return reply.code(200).send(app.ok(req, updated));
    } catch (err) {
      if (err instanceof ConsultationError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 4. PATCH /api/midwife/video-consultations/:publicId/status
  app.patch("/:publicId/status", async (req, reply) => {
    const { publicId } = req.params as { publicId: string };
    const parse = videoConsultationStatusUpdateSchema.safeParse(req.body);
    if (!parse.success) return invalid(reply, app, req, parse.error);

    try {
      const updated = await updateMidwifeVideoStatus(
        app.prisma,
        req.user.sub,
        publicId,
        parse.data,
      );

      await audit(app.prisma, req, {
        ...actor(req),
        action: "UPDATE_VIDEO_CONSULTATION_STATUS",
        result: "SUCCESS",
        entityType: "VideoConsultation",
        entityId: updated.publicId,
        metadata: {
          status: updated.status,
          completedAt: updated.completedAt,
          cancelledAt: updated.cancelledAt,
        },
      });

      return reply.code(200).send(app.ok(req, updated));
    } catch (err) {
      if (err instanceof ConsultationError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });
}
