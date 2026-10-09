import Fastify, { type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { PrismaClient } from "@prisma/client";
import { loadEnv, type Env } from "./config/env.js";
import { authRoutes } from "./modules/auth/routes.js";
import { healthRoutes } from "./modules/health/routes.js";
import { userRoutes } from "./modules/users/routes.js";
import {
  adminStage3Routes,
  midwifeStage3Routes,
  motherStage3Routes,
  referenceRoutes,
} from "./modules/stage3/routes.js";
import {
  midwifeMonitoringRoutes,
  motherMonitoringRoutes,
} from "./modules/monitoring/routes.js";
import {
  adminAncRoutes,
  midwifeAncRoutes,
  motherAncRoutes,
} from "./modules/anc/routes.js";
import {
  adminDangerScreeningRoutes,
  midwifeDangerScreeningRoutes,
  motherDangerScreeningRoutes,
} from "./modules/danger-screening/routes.js";
import {
  midwifeP4kRoutes,
  motherP4kRoutes,
} from "./modules/p4k/routes.js";
import {
  adminEducationRoutes,
  motherEducationRoutes,
} from "./modules/education/routes.js";
import {
  consultationAttachmentRoutes,
  midwifeConsultationRoutes,
  motherConsultationRoutes,
} from "./modules/consultation/routes.js";
import {
  midwifeVideoConsultationRoutes,
  motherVideoConsultationRoutes,
} from "./modules/consultation/video-routes.js";
import {
  midwifeDashboardRoutes,
  motherHomeVisitRoutes,
} from "./modules/midwife-dashboard/routes.js";
declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    env: Env;
    authenticate: (req: FastifyRequest) => Promise<void>;
    authorize: (
      roles: ("MOTHER" | "MIDWIFE" | "ADMIN")[],
    ) => (req: FastifyRequest) => Promise<void>;
    ok: <T>(
      req: FastifyRequest,
      data: T,
    ) => { success: true; data: T; requestId: string };
    fail: (
      req: FastifyRequest,
      code: string,
      message: string,
      details?: unknown,
    ) => {
      success: false;
      error: {
        code: string;
        message: string;
        details?: unknown;
        fieldErrors?: Record<string, string[]>;
      };
      requestId: string;
    };
  }
}
export function buildApp(
  options: { env?: NodeJS.ProcessEnv; prisma?: PrismaClient } = {},
) {
  const env = loadEnv(options.env);
  const app = Fastify({
    bodyLimit: 15 * 1024 * 1024,
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info",
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.body.password",
          "req.body.passwordConfirmation",
          "req.body.refreshToken",
          "res.headers.set-cookie",
          "*.password",
          "*.refreshToken",
          "*.accessToken",
          "*.phoneNumber",
        ],
        censor: "[REDACTED]",
      },
    },
    genReqId: (req) =>
      (req.headers["x-request-id"] as string | undefined) ??
      crypto.randomUUID(),
  });
  const prisma =
    options.prisma ??
    new PrismaClient({
      datasources: { db: { url: env.DATABASE_URL } },
    });
  app.decorate("env", env);
  app.decorate("prisma", prisma);
  app.decorate("ok", (req, data) => ({
    success: true,
    data,
    requestId: req.id,
  }));
  app.decorate("fail", (req, code, message, details) => {
    let fieldErrors: Record<string, string[]> | undefined;
    if (details && typeof details === "object") {
      if (
        "fieldErrors" in details &&
        details.fieldErrors &&
        typeof details.fieldErrors === "object"
      ) {
        fieldErrors = details.fieldErrors as Record<string, string[]>;
      }
    }
    return {
      success: false,
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
        ...(fieldErrors ? { fieldErrors } : {}),
      },
      requestId: req.id,
    };
  });
  app.register(cookie);
  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || env.corsOrigins.includes(origin)) cb(null, true);
      else cb(new Error("Origin tidak diizinkan"), false);
    },
    credentials: true,
  });
  app.register(helmet, { global: true, hsts: env.NODE_ENV === "production" });
  app.register(rateLimit, { global: false, max: 100, timeWindow: "1 minute" });
  app.register(jwt, { secret: env.JWT_ACCESS_SECRET });
  app.decorate("authenticate", async (req) => {
    await req.jwtVerify();
  });
  app.decorate("authorize", (roles) => async (req) => {
    await req.jwtVerify();
    if (!roles.includes(req.user.role)) {
      const e = new Error("Akses ditolak");
      Object.assign(e, { statusCode: 403, code: "FORBIDDEN" });
      throw e;
    }
  });
  app.register(swagger, {
    openapi: {
      info: { title: "PFRAM Telemedicine API", version: "0.1.0" },
      tags: [
        { name: "health" },
        { name: "auth" },
        { name: "stage3" },
        { name: "monitoring" },
        { name: "anc" },
        { name: "danger-screening" },
      ],
    },
  });
  app.register(swaggerUi, { routePrefix: "/docs" });
  app.register(healthRoutes, { prefix: "/api/health" });
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(userRoutes, { prefix: "/api/users" });
  app.register(userRoutes, { prefix: "/api/admin/users" });
  app.register(referenceRoutes, { prefix: "/api/reference" });
  app.register(adminStage3Routes, { prefix: "/api/admin" });
  app.register(motherStage3Routes, { prefix: "/api/mother" });
  app.register(midwifeStage3Routes, { prefix: "/api/midwife" });
  app.register(motherMonitoringRoutes, { prefix: "/api/mother" });
  app.register(midwifeMonitoringRoutes, { prefix: "/api/midwife" });
  app.register(adminAncRoutes, { prefix: "/api/admin" });
  app.register(motherAncRoutes, { prefix: "/api/mother" });
  app.register(midwifeAncRoutes, { prefix: "/api/midwife" });
  app.register(adminDangerScreeningRoutes, { prefix: "/api/admin" });
  app.register(motherDangerScreeningRoutes, { prefix: "/api/mother" });
  app.register(midwifeDangerScreeningRoutes, { prefix: "/api/midwife" });
  app.register(motherP4kRoutes, { prefix: "/api/mother" });
  app.register(midwifeP4kRoutes, { prefix: "/api/midwife" });
  app.register(motherEducationRoutes, { prefix: "/api/mother" });
  app.register(adminEducationRoutes, { prefix: "/api/admin" });
  app.register(motherConsultationRoutes, { prefix: "/api/mother/consultation" });
  app.register(midwifeConsultationRoutes, { prefix: "/api/midwife/consultations" });
  app.register(consultationAttachmentRoutes, { prefix: "/api/consultation/attachments" });
  app.register(motherVideoConsultationRoutes, { prefix: "/api/mother/video-consultations" });
  app.register(midwifeVideoConsultationRoutes, { prefix: "/api/midwife/video-consultations" });
  app.register(midwifeDashboardRoutes, { prefix: "/api/midwife" });
  app.register(motherHomeVisitRoutes, { prefix: "/api/mother" });
  app.setErrorHandler((error, req, reply) => {
    req.log.error({ err: error }, "request_failed");

    const rawMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string }).code;
    let status = (error as { statusCode?: number }).statusCode ?? 500;
    let code = errorCode ?? (status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR");
    let safeMessage = rawMessage;

    // Detect Prisma and database errors
    const isPrismaError =
      errorCode?.startsWith("P") ||
      rawMessage.toLowerCase().includes("prisma") ||
      rawMessage.includes("PrismaClient") ||
      Boolean((error as { constructor?: { name?: string } })?.constructor?.name?.includes("Prisma"));

    if (
      errorCode === "P2025" ||
      errorCode === "P2001" ||
      rawMessage.includes("No record was found") ||
      rawMessage.includes("Record to update not found")
    ) {
      status = 404;
      code = "NOT_FOUND";
      safeMessage = "Data yang diminta tidak ditemukan.";
    } else if (
      errorCode === "P2002" ||
      rawMessage.includes("Unique constraint failed")
    ) {
      status = 409;
      code = "CONFLICT";
      safeMessage = "Data tersebut sudah terdaftar di sistem.";
    } else if (
      errorCode === "P2003" ||
      rawMessage.includes("Foreign key constraint")
    ) {
      status = 400;
      code = "FOREIGN_KEY_VIOLATION";
      safeMessage =
        "Relasi data tidak valid atau data masih digunakan oleh entitas lain.";
    } else if (
      isPrismaError ||
      rawMessage.toLowerCase().includes("sql") ||
      rawMessage.toLowerCase().includes("postgres")
    ) {
      status = 500;
      code = "DATABASE_ERROR";
      safeMessage = "Data belum berhasil diproses. Silakan coba kembali.";
    } else if (status === 500) {
      safeMessage = "Data belum berhasil diproses. Silakan coba kembali.";
    }

    const details =
      (error as { details?: unknown }).details ??
      ((error as { fieldErrors?: unknown }).fieldErrors
        ? { fieldErrors: (error as { fieldErrors: unknown }).fieldErrors }
        : undefined);

    reply.code(status).send(app.fail(req, code, safeMessage, details));
  });
  app.addHook("onClose", async () => prisma.$disconnect());
  return app;
}
