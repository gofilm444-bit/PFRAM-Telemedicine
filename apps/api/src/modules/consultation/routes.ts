import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  consultationAttentionUpdateSchema,
  consultationMessageCreateSchema,
  consultationQuerySchema,
  consultationStatusUpdateSchema,
} from "@pfram/validation";
import { audit } from "../auth/service.js";
import {
  ConsultationError,
  getAttachmentStream,
  getMidwifeMessages,
  getMidwifeThreadDetail,
  getMidwifeThreads,
  getMotherMessages,
  getOrCreateMotherThread,
  markMidwifeMessagesRead,
  markMotherMessagesRead,
  sendMidwifeMessage,
  sendMotherMessage,
  updateMidwifeAttentionFlag,
  updateMidwifeThreadStatus,
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

export async function motherConsultationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MOTHER"]));

  // 1. GET /api/mother/consultation/thread
  app.get("/thread", async (req, reply) => {
    try {
      const thread = await getOrCreateMotherThread(app.prisma, req.user.sub);
      return reply.code(200).send(app.ok(req, thread));
    } catch (err) {
      if (err instanceof ConsultationError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 2. GET /api/mother/consultation/messages
  app.get("/messages", async (req, reply) => {
    const parse = consultationQuerySchema.safeParse(req.query);
    if (!parse.success) return invalid(reply, app, req, parse.error);

    try {
      const result = await getMotherMessages(app.prisma, req.user.sub, parse.data);
      return reply.code(200).send(app.ok(req, result));
    } catch (err) {
      if (err instanceof ConsultationError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 3. POST /api/mother/consultation/messages
  app.post("/messages", async (req, reply) => {
    const parse = consultationMessageCreateSchema.safeParse(req.body);
    if (!parse.success) return invalid(reply, app, req, parse.error);

    try {
      const message = await sendMotherMessage(app.prisma, req.user.sub, parse.data);
      await audit(app.prisma, req, {
        ...actor(req),
        action: "CONSULTATION_MESSAGE_SENT_BY_MOTHER",
        result: "SUCCESS",
        entityType: "ConsultationMessage",
        entityId: message.publicId,
        metadata: {
          messageType: message.messageType,
          hasAttachment: (message.attachments ?? []).length > 0,
        },
      });
      return reply.code(201).send(app.ok(req, message));
    } catch (err) {
      if (err instanceof ConsultationError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 4. POST /api/mother/consultation/read
  app.post("/read", async (req, reply) => {
    try {
      const result = await markMotherMessagesRead(app.prisma, req.user.sub);
      return reply.code(200).send(app.ok(req, result));
    } catch (err) {
      if (err instanceof ConsultationError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });
}

export async function midwifeConsultationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MIDWIFE"]));

  // 1. GET /api/midwife/consultations
  app.get("/", async (req, reply) => {
    const parse = consultationQuerySchema.safeParse(req.query);
    if (!parse.success) return invalid(reply, app, req, parse.error);

    try {
      const result = await getMidwifeThreads(app.prisma, req.user.sub, parse.data);
      return reply.code(200).send(app.ok(req, result));
    } catch (err) {
      if (err instanceof ConsultationError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 2. GET /api/midwife/consultations/:threadPublicId
  app.get<{ Params: { threadPublicId: string } }>(
    "/:threadPublicId",
    async (req, reply) => {
      try {
        const thread = await getMidwifeThreadDetail(
          app.prisma,
          req.user.sub,
          req.params.threadPublicId,
        );
        return reply.code(200).send(app.ok(req, thread));
      } catch (err) {
        if (err instanceof ConsultationError) {
          return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
        }
        throw err;
      }
    },
  );

  // 3. GET /api/midwife/consultations/:threadPublicId/messages
  app.get<{ Params: { threadPublicId: string } }>(
    "/:threadPublicId/messages",
    async (req, reply) => {
      const parse = consultationQuerySchema.safeParse(req.query);
      if (!parse.success) return invalid(reply, app, req, parse.error);

      try {
        const result = await getMidwifeMessages(
          app.prisma,
          req.user.sub,
          req.params.threadPublicId,
          parse.data,
        );
        return reply.code(200).send(app.ok(req, result));
      } catch (err) {
        if (err instanceof ConsultationError) {
          return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
        }
        throw err;
      }
    },
  );

  // 4. POST /api/midwife/consultations/:threadPublicId/messages
  app.post<{ Params: { threadPublicId: string } }>(
    "/:threadPublicId/messages",
    async (req, reply) => {
      const parse = consultationMessageCreateSchema.safeParse(req.body);
      if (!parse.success) return invalid(reply, app, req, parse.error);

      try {
        const message = await sendMidwifeMessage(
          app.prisma,
          req.user.sub,
          req.params.threadPublicId,
          parse.data,
        );
        await audit(app.prisma, req, {
          ...actor(req),
          action: "CONSULTATION_MESSAGE_SENT_BY_MIDWIFE",
          result: "SUCCESS",
          entityType: "ConsultationMessage",
          entityId: message.publicId,
          metadata: {
            threadPublicId: req.params.threadPublicId,
            messageType: message.messageType,
          },
        });
        return reply.code(201).send(app.ok(req, message));
      } catch (err) {
        if (err instanceof ConsultationError) {
          return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
        }
        throw err;
      }
    },
  );

  // 5. PATCH /api/midwife/consultations/:threadPublicId/attention
  app.patch<{ Params: { threadPublicId: string } }>(
    "/:threadPublicId/attention",
    async (req, reply) => {
      const parse = consultationAttentionUpdateSchema.safeParse(req.body);
      if (!parse.success) return invalid(reply, app, req, parse.error);

      try {
        const updated = await updateMidwifeAttentionFlag(
          app.prisma,
          req.user.sub,
          req.params.threadPublicId,
          parse.data.attentionFlag,
        );
        await audit(app.prisma, req, {
          ...actor(req),
          action: "CONSULTATION_ATTENTION_UPDATED",
          result: "SUCCESS",
          entityType: "ConsultationThread",
          entityId: updated.publicId,
          metadata: { attentionFlag: parse.data.attentionFlag },
        });
        return reply.code(200).send(app.ok(req, updated));
      } catch (err) {
        if (err instanceof ConsultationError) {
          return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
        }
        throw err;
      }
    },
  );

  // 6. PATCH /api/midwife/consultations/:threadPublicId/status
  app.patch<{ Params: { threadPublicId: string } }>(
    "/:threadPublicId/status",
    async (req, reply) => {
      const parse = consultationStatusUpdateSchema.safeParse(req.body);
      if (!parse.success) return invalid(reply, app, req, parse.error);

      try {
        const updated = await updateMidwifeThreadStatus(
          app.prisma,
          req.user.sub,
          req.params.threadPublicId,
          parse.data.status,
        );
        await audit(app.prisma, req, {
          ...actor(req),
          action: "CONSULTATION_STATUS_UPDATED",
          result: "SUCCESS",
          entityType: "ConsultationThread",
          entityId: updated.publicId,
          metadata: { status: parse.data.status },
        });
        return reply.code(200).send(app.ok(req, updated));
      } catch (err) {
        if (err instanceof ConsultationError) {
          return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
        }
        throw err;
      }
    },
  );

  // 7. POST /api/midwife/consultations/:threadPublicId/read
  app.post<{ Params: { threadPublicId: string } }>(
    "/:threadPublicId/read",
    async (req, reply) => {
      try {
        const result = await markMidwifeMessagesRead(
          app.prisma,
          req.user.sub,
          req.params.threadPublicId,
        );
        return reply.code(200).send(app.ok(req, result));
      } catch (err) {
        if (err instanceof ConsultationError) {
          return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
        }
        throw err;
      }
    },
  );
}

export async function consultationAttachmentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // GET /api/consultation/attachments/:attachmentPublicId/file
  app.get<{ Params: { attachmentPublicId: string } }>(
    "/:attachmentPublicId/file",
    async (req, reply) => {
      try {
        const fileStream = await getAttachmentStream(
          app.prisma,
          req.user,
          req.params.attachmentPublicId,
        );

        return reply
          .header("Content-Type", fileStream.contentType)
          .header(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(fileStream.filename)}"`,
          )
          .header("Cache-Control", "private, no-cache, no-store, must-revalidate")
          .send(fileStream.buffer);
      } catch (err) {
        if (err instanceof ConsultationError) {
          return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
        }
        throw err;
      }
    },
  );
}
