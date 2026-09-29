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
      error: { code: string; message: string; details?: unknown };
      requestId: string;
    };
  }
}
export function buildApp(
  options: { env?: NodeJS.ProcessEnv; prisma?: PrismaClient } = {},
) {
  const env = loadEnv(options.env);
  const app = Fastify({
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
  const prisma = options.prisma ?? new PrismaClient();
  app.decorate("env", env);
  app.decorate("prisma", prisma);
  app.decorate("ok", (req, data) => ({
    success: true,
    data,
    requestId: req.id,
  }));
  app.decorate("fail", (req, code, message, details) => ({
    success: false,
    error: { code, message, ...(details === undefined ? {} : { details }) },
    requestId: req.id,
  }));
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
      ],
    },
  });
  app.register(swaggerUi, { routePrefix: "/docs" });
  app.register(healthRoutes, { prefix: "/api/health" });
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(userRoutes, { prefix: "/api/users" });
  app.register(referenceRoutes, { prefix: "/api/reference" });
  app.register(adminStage3Routes, { prefix: "/api/admin" });
  app.register(motherStage3Routes, { prefix: "/api/mother" });
  app.register(midwifeStage3Routes, { prefix: "/api/midwife" });
  app.register(motherMonitoringRoutes, { prefix: "/api/mother" });
  app.register(midwifeMonitoringRoutes, { prefix: "/api/midwife" });
  app.setErrorHandler((error, req, reply) => {
    req.log.error({ err: error }, "request_failed");
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    const code =
      (error as { code?: string }).code ??
      (status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR");
    reply
      .code(status)
      .send(
        app.fail(
          req,
          code,
          status === 500 && env.NODE_ENV === "production"
            ? "Terjadi kesalahan internal"
            : error instanceof Error
              ? error.message
              : "Permintaan gagal",
        ),
      );
  });
  app.addHook("onClose", async () => prisma.$disconnect());
  return app;
}
