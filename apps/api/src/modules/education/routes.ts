import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  educationArticleCreateSchema,
  educationArticleUpdateSchema,
  educationQuerySchema,
} from "@pfram/validation";
import { audit } from "../auth/service.js";
import {
  archiveEducationArticle,
  createEducationArticle,
  EducationError,
  getArticleBySlug,
  getFeaturedArticlesForMother,
  getMotherEducationList,
  getAdminEducationList,
  updateEducationArticle,
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

export async function motherEducationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MOTHER"]));

  // 1. GET /api/mother/education
  app.get("/education", async (req, reply) => {
    const parse = educationQuerySchema.safeParse(req.query);
    if (!parse.success) return invalid(reply, app, req, parse.error);

    const result = await getMotherEducationList(
      app.prisma,
      req.user.sub,
      parse.data,
    );
    return reply.send(app.ok(req, result));
  });

  // 2. GET /api/mother/education/featured
  app.get("/education/featured", async (req, reply) => {
    const result = await getFeaturedArticlesForMother(
      app.prisma,
      req.user.sub,
    );
    return reply.send(app.ok(req, result));
  });

  // 3. GET /api/mother/education/:slug
  app.get<{ Params: { slug: string } }>("/education/:slug", async (req, reply) => {
    const { slug } = req.params;
    try {
      const article = await getArticleBySlug(app.prisma, slug, true);
      return reply.send(app.ok(req, article));
    } catch (err) {
      if (err instanceof EducationError) {
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });
}

const adminQuerySchema = educationQuerySchema.extend({
  includeUnpublished: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((val) => (typeof val === "boolean" ? val : val === "true"))
    .optional(),
});

export async function adminEducationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["ADMIN"]));

  // 1. GET /api/admin/education
  app.get("/education", async (req, reply) => {
    const parse = adminQuerySchema.safeParse(req.query);
    if (!parse.success) return invalid(reply, app, req, parse.error);

    const result = await getAdminEducationList(app.prisma, parse.data);
    return reply.send(app.ok(req, result));
  });

  // 2. POST /api/admin/education
  app.post("/education", async (req, reply) => {
    const parse = educationArticleCreateSchema.safeParse(req.body);
    if (!parse.success) return invalid(reply, app, req, parse.error);

    try {
      const article = await createEducationArticle(app.prisma, parse.data);
      await audit(app.prisma, req, {
        ...actor(req),
        action: "EDUCATION_ARTICLE_CREATED",
        result: "SUCCESS",
        entityType: "EducationArticle",
        entityId: article.publicId,
        metadata: { slug: article.slug, title: article.title },
      });
      return reply.code(201).send(app.ok(req, article));
    } catch (err) {
      if (err instanceof EducationError) {
        await audit(app.prisma, req, {
          ...actor(req),
          action: "EDUCATION_ARTICLE_CREATE_FAILED",
          result: "FAILED",
          entityType: "EducationArticle",
          metadata: { error: err.message },
        });
        return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
      }
      throw err;
    }
  });

  // 3. PATCH /api/admin/education/:publicId
  app.patch<{ Params: { publicId: string } }>(
    "/education/:publicId",
    async (req, reply) => {
      const parse = educationArticleUpdateSchema.safeParse(req.body);
      if (!parse.success) return invalid(reply, app, req, parse.error);

      try {
        const article = await updateEducationArticle(
          app.prisma,
          req.params.publicId,
          parse.data,
        );
        await audit(app.prisma, req, {
          ...actor(req),
          action: "EDUCATION_ARTICLE_UPDATED",
          result: "SUCCESS",
          entityType: "EducationArticle",
          entityId: article.publicId,
          metadata: { changes: parse.data },
        });
        return reply.send(app.ok(req, article));
      } catch (err) {
        if (err instanceof EducationError) {
          return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
        }
        throw err;
      }
    },
  );

  // 4. POST /api/admin/education/:publicId/archive
  app.post<{ Params: { publicId: string } }>(
    "/education/:publicId/archive",
    async (req, reply) => {
      try {
        const result = await archiveEducationArticle(
          app.prisma,
          req.params.publicId,
        );
        await audit(app.prisma, req, {
          ...actor(req),
          action: "EDUCATION_ARTICLE_ARCHIVED",
          result: "SUCCESS",
          entityType: "EducationArticle",
          entityId: req.params.publicId,
        });
        return reply.send(app.ok(req, result));
      } catch (err) {
        if (err instanceof EducationError) {
          return reply.code(err.statusCode).send(app.fail(req, err.code, err.message));
        }
        throw err;
      }
    },
  );
}
