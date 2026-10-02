import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  p4kChecklistPatchSchema,
  p4kPlanInputSchema,
  referralPlanInputSchema,
} from "@pfram/validation";
import { audit } from "../auth/service.js";
import { verifyActiveAssignment } from "../monitoring/service.js";
import {
  P4kError,
  ensureP4kPlanWithDefaults,
  ensureReferralPlanWithDefaults,
  getActivePregnancyForMother,
  patchP4kChecklist,
  p4kPlanView,
  referralPlanView,
  updateP4kPlan,
  updateReferralPlan,
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

export async function motherP4kRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MOTHER"]));

  // 1. GET /api/mother/p4k
  app.get("/p4k", async (req, reply) => {
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    try {
      const pregnancy = await getActivePregnancyForMother(app.prisma, mother.id);
      const plan = await ensureP4kPlanWithDefaults(app.prisma, mother.id, pregnancy.id);
      return reply.code(200).send(app.ok(req, p4kPlanView(plan)));
    } catch (err) {
      if (err instanceof P4kError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 2. PUT /api/mother/p4k
  app.put("/p4k", async (req, reply) => {
    const parsed = p4kPlanInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }

    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    try {
      const pregnancy = await getActivePregnancyForMother(app.prisma, mother.id);
      const updated = await updateP4kPlan(app.prisma, mother.id, pregnancy.id, parsed.data);

      await audit(app.prisma, req, {
        ...actor(req),
        action: "P4K_UPDATED",
        result: "SUCCESS",
        entityType: "P4kPlan",
        entityId: updated.publicId,
      });

      return reply.code(200).send(app.ok(req, updated));
    } catch (err) {
      if (err instanceof P4kError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 3. GET /api/mother/p4k/checklist
  app.get("/p4k/checklist", async (req, reply) => {
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    try {
      const pregnancy = await getActivePregnancyForMother(app.prisma, mother.id);
      const plan = await ensureP4kPlanWithDefaults(app.prisma, mother.id, pregnancy.id);
      const view = p4kPlanView(plan);
      return reply.code(200).send(
        app.ok(req, {
          items: view.checklistItems,
          progress: view.checklistProgress,
        }),
      );
    } catch (err) {
      if (err instanceof P4kError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 4. PATCH /api/mother/p4k/checklist
  app.patch("/p4k/checklist", async (req, reply) => {
    const parsed = p4kChecklistPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }

    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    try {
      const pregnancy = await getActivePregnancyForMother(app.prisma, mother.id);
      const result = await patchP4kChecklist(app.prisma, mother.id, pregnancy.id, parsed.data);

      await audit(app.prisma, req, {
        ...actor(req),
        action: "P4K_CHECKLIST_UPDATED",
        result: "SUCCESS",
        entityType: "P4kPlan",
        entityId: pregnancy.id,
      });

      return reply.code(200).send(app.ok(req, result));
    } catch (err) {
      if (err instanceof P4kError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 5. GET /api/mother/referral-plan
  app.get("/referral-plan", async (req, reply) => {
    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    try {
      const pregnancy = await getActivePregnancyForMother(app.prisma, mother.id);
      const plan = await ensureReferralPlanWithDefaults(app.prisma, mother.id, pregnancy.id);
      return reply.code(200).send(app.ok(req, referralPlanView(plan)));
    } catch (err) {
      if (err instanceof P4kError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 6. PUT /api/mother/referral-plan
  app.put("/referral-plan", async (req, reply) => {
    const parsed = referralPlanInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }

    const mother = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!mother) {
      return reply
        .code(404)
        .send(app.fail(req, "NOT_FOUND", "Profil ibu tidak ditemukan"));
    }

    try {
      const pregnancy = await getActivePregnancyForMother(app.prisma, mother.id);
      const updated = await updateReferralPlan(app.prisma, mother.id, pregnancy.id, parsed.data);

      await audit(app.prisma, req, {
        ...actor(req),
        action: "REFERRAL_PLAN_UPDATED",
        result: "SUCCESS",
        entityType: "ReferralPlan",
        entityId: updated.publicId,
      });

      return reply.code(200).send(app.ok(req, updated));
    } catch (err) {
      if (err instanceof P4kError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });
}

export async function midwifeP4kRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MIDWIFE"]));

  // 1. GET /api/midwife/mothers/:motherPublicId/p4k
  app.get("/mothers/:motherPublicId/p4k", async (req, reply) => {
    const { motherPublicId } = req.params as { motherPublicId: string };
    const { mother } = await verifyActiveAssignment(app.prisma, req.user.sub, motherPublicId);

    const activePregnancy = mother.pregnancies[0];
    if (!activePregnancy) {
      return reply
        .code(404)
        .send(app.fail(req, "NO_ACTIVE_PREGNANCY", "Ibu binaan tidak memiliki kehamilan aktif"));
    }

    const plan = await ensureP4kPlanWithDefaults(app.prisma, mother.id, activePregnancy.id);
    return reply.code(200).send(app.ok(req, p4kPlanView(plan)));
  });

  // 2. PUT /api/midwife/mothers/:motherPublicId/p4k
  app.put("/mothers/:motherPublicId/p4k", async (req, reply) => {
    const { motherPublicId } = req.params as { motherPublicId: string };
    const parsed = p4kPlanInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }

    const { mother } = await verifyActiveAssignment(app.prisma, req.user.sub, motherPublicId);
    const activePregnancy = mother.pregnancies[0];
    if (!activePregnancy) {
      return reply
        .code(404)
        .send(app.fail(req, "NO_ACTIVE_PREGNANCY", "Ibu binaan tidak memiliki kehamilan aktif"));
    }

    try {
      const updated = await updateP4kPlan(app.prisma, mother.id, activePregnancy.id, parsed.data);

      await audit(app.prisma, req, {
        ...actor(req),
        action: "P4K_UPDATED_BY_MIDWIFE",
        result: "SUCCESS",
        entityType: "P4kPlan",
        entityId: updated.publicId,
        metadata: { motherPublicId },
      });

      return reply.code(200).send(app.ok(req, updated));
    } catch (err) {
      if (err instanceof P4kError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 3. GET /api/midwife/mothers/:motherPublicId/referral-plan
  app.get("/mothers/:motherPublicId/referral-plan", async (req, reply) => {
    const { motherPublicId } = req.params as { motherPublicId: string };
    const { mother } = await verifyActiveAssignment(app.prisma, req.user.sub, motherPublicId);

    const activePregnancy = mother.pregnancies[0];
    if (!activePregnancy) {
      return reply
        .code(404)
        .send(app.fail(req, "NO_ACTIVE_PREGNANCY", "Ibu binaan tidak memiliki kehamilan aktif"));
    }

    const plan = await ensureReferralPlanWithDefaults(app.prisma, mother.id, activePregnancy.id);
    return reply.code(200).send(app.ok(req, referralPlanView(plan)));
  });

  // 4. PUT /api/midwife/mothers/:motherPublicId/referral-plan
  app.put("/mothers/:motherPublicId/referral-plan", async (req, reply) => {
    const { motherPublicId } = req.params as { motherPublicId: string };
    const parsed = referralPlanInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalid(reply, app, req, parsed.error);
    }

    const { mother } = await verifyActiveAssignment(app.prisma, req.user.sub, motherPublicId);
    const activePregnancy = mother.pregnancies[0];
    if (!activePregnancy) {
      return reply
        .code(404)
        .send(app.fail(req, "NO_ACTIVE_PREGNANCY", "Ibu binaan tidak memiliki kehamilan aktif"));
    }

    try {
      const updated = await updateReferralPlan(app.prisma, mother.id, activePregnancy.id, parsed.data);

      await audit(app.prisma, req, {
        ...actor(req),
        action: "REFERRAL_PLAN_UPDATED_BY_MIDWIFE",
        result: "SUCCESS",
        entityType: "ReferralPlan",
        entityId: updated.publicId,
        metadata: { motherPublicId },
      });

      return reply.code(200).send(app.ok(req, updated));
    } catch (err) {
      if (err instanceof P4kError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });
}
