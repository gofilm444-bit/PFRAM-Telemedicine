import bcrypt from "bcrypt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  loginSchema,
  motherRegistrationSchema,
  refreshSessionSchema,
} from "@pfram/validation";
import { audit, authenticatedUserView, issueSession, verifyPassword } from "./service.js";
import { hashToken, newOpaqueToken, safeEqual } from "../../shared/security.js";
const profileInclude = {
  motherProfile: true,
  midwifeProfile: true,
  adminProfile: true,
} as const;
function setWebCookies(
  app: FastifyInstance,
  reply: FastifyReply,
  refreshToken: string,
) {
  const csrf = newOpaqueToken();
  const common = {
    secure: app.env.cookieSecure,
    sameSite: "strict" as const,
  };
  reply.setCookie("pfram_refresh", refreshToken, {
    ...common,
    path: "/api/auth",
    httpOnly: true,
    maxAge: app.env.REFRESH_TOKEN_DAYS * 86400,
  });
  // CSRF harus dapat dibaca oleh aplikasi web melalui document.cookie.
  // Hapus cookie legacy yang sebelumnya dibatasi ke /api/auth.
  reply.clearCookie("pfram_csrf", { path: "/api/auth" });
  reply.setCookie("pfram_csrf", csrf, {
    ...common,
    path: "/",
    httpOnly: false,
    maxAge: app.env.REFRESH_TOKEN_DAYS * 86400,
  });
  return csrf;
}
function clearCookies(reply: FastifyReply) {
  reply.clearCookie("pfram_refresh", { path: "/api/auth" });
  reply.clearCookie("pfram_csrf", { path: "/" });
  // Cleanup cookie legacy dari versi sebelum session-restore hotfix.
  reply.clearCookie("pfram_csrf", { path: "/api/auth" });
}
function tokenFrom(
  req: FastifyRequest,
  body: { refreshToken?: string | undefined },
) {
  return body.refreshToken ?? req.cookies.pfram_refresh;
}
function assertCsrf(req: FastifyRequest, clientType: string) {
  if (clientType !== "web") return;
  const cookie = req.cookies.pfram_csrf;
  const header = req.headers["x-csrf-token"];
  if (!cookie || typeof header !== "string" || !safeEqual(cookie, header)) {
    const e = new Error("Token CSRF tidak valid");
    Object.assign(e, { statusCode: 403, code: "CSRF_INVALID" });
    throw e;
  }
}
export async function authRoutes(app: FastifyInstance) {
  app.get("/consents", async (req) =>
    app.ok(
      req,
      await app.prisma.consentDocument.findMany({
        where: { active: true },
        select: { id: true, documentType: true, version: true, title: true },
        orderBy: { effectiveAt: "desc" },
      }),
    ),
  );
  app.post(
    "/register/mother",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = motherRegistrationSchema.safeParse(req.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send(
            app.fail(
              req,
              "VALIDATION_ERROR",
              "Data registrasi tidak valid",
              parsed.error.flatten(),
            ),
          );
      const v = parsed.data;
      try {
        const docs = await app.prisma.consentDocument.findMany({
          where: { id: { in: v.consentDocumentIds }, active: true },
        });
        if (docs.length !== v.consentDocumentIds.length)
          return reply
            .code(400)
            .send(
              app.fail(
                req,
                "CONSENT_INVALID",
                "Dokumen persetujuan tidak aktif",
              ),
            );
        const user = await app.prisma.user.create({
          data: {
            phoneNumber: v.phoneNumber,
            passwordHash: await bcrypt.hash(v.password, 12),
            role: "MOTHER",
            status: "ACTIVE",
            motherProfile: { create: { fullName: v.fullName } },
            consents: { create: docs.map((d) => ({ documentId: d.id })) },
          },
          include: profileInclude,
        });
        const s = await issueSession(app, user, req);
        await audit(app.prisma, req, {
          actorUserId: user.id,
          actorRole: user.role,
          action: "REGISTER_SUCCESS",
          result: "SUCCESS",
        });
        const csrf =
          v.clientType === "web"
            ? setWebCookies(app, reply, s.refreshToken)
            : undefined;
        return reply.code(201).send(
          app.ok(req, {
            ...s,
            refreshToken:
              v.clientType === "mobile" ? s.refreshToken : undefined,
            csrfToken: csrf,
            user: await authenticatedUserView(app.prisma, user),
          }),
        );
      } catch (e) {
        await audit(app.prisma, req, {
          action: "REGISTER_FAILED",
          result: "FAILED",
        });
        if ((e as { code?: string }).code === "P2002")
          return reply
            .code(409)
            .send(
              app.fail(
                req,
                "PHONE_ALREADY_REGISTERED",
                "Nomor HP sudah terdaftar",
              ),
            );
        throw e;
      }
    },
  );
  app.post(
    "/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send(
            app.fail(
              req,
              "VALIDATION_ERROR",
              "Data login tidak valid",
              parsed.error.flatten(),
            ),
          );
      const v = parsed.data;
      const user = await app.prisma.user.findUnique({
        where: { phoneNumber: v.phoneNumber },
        include: profileInclude,
      });
      if (!user)
        return reply
          .code(401)
          .send(
            app.fail(
              req,
              "INVALID_CREDENTIALS",
              "Nomor HP atau kata sandi salah",
            ),
          );
      if (user.status !== "ACTIVE")
        return reply
          .code(403)
          .send(app.fail(req, "ACCOUNT_UNAVAILABLE", "Akun tidak aktif"));
      if (user.lockedUntil && user.lockedUntil > new Date())
        return reply
          .code(423)
          .send(app.fail(req, "ACCOUNT_LOCKED", "Akun dikunci sementara"));
      if (!(await verifyPassword(user, v.password))) {
        const count = user.failedLoginCount + 1;
        await app.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: count,
            lockedUntil: count >= 5 ? new Date(Date.now() + 15 * 60000) : null,
          },
        });
        await audit(app.prisma, req, {
          actorUserId: user.id,
          actorRole: user.role,
          action: "LOGIN_FAILED",
          result: "FAILED",
        });
        return reply
          .code(401)
          .send(
            app.fail(
              req,
              "INVALID_CREDENTIALS",
              "Nomor HP atau kata sandi salah",
            ),
          );
      }
      await app.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
      });
      const s = await issueSession(app, user, req);
      await audit(app.prisma, req, {
        actorUserId: user.id,
        actorRole: user.role,
        action: "LOGIN_SUCCESS",
        result: "SUCCESS",
      });
      const csrf =
        v.clientType === "web"
          ? setWebCookies(app, reply, s.refreshToken)
          : undefined;
      return app.ok(req, {
        ...s,
        refreshToken: v.clientType === "mobile" ? s.refreshToken : undefined,
        csrfToken: csrf,
        user: await authenticatedUserView(app.prisma, user),
      });
    },
  );
  app.post(
    "/refresh",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = refreshSessionSchema.safeParse(req.body ?? {});
      if (!parsed.success)
        return reply
          .code(400)
          .send(app.fail(req, "VALIDATION_ERROR", "Permintaan tidak valid"));
      assertCsrf(req, parsed.data.clientType);
      const token = tokenFrom(req, parsed.data);
      if (!token)
        return reply
          .code(401)
          .send(app.fail(req, "SESSION_INVALID", "Sesi tidak tersedia"));
      const session = await app.prisma.refreshSession.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { user: { include: profileInclude } },
      });
      if (
        !session ||
        session.revokedAt ||
        session.expiresAt <= new Date() ||
        session.user.status !== "ACTIVE"
      )
        return reply
          .code(401)
          .send(app.fail(req, "SESSION_INVALID", "Sesi tidak valid"));
      await app.prisma.$transaction((tx) =>
        tx.refreshSession.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        }),
      );
      const s = await issueSession(app, session.user, req);
      await audit(app.prisma, req, {
        actorUserId: session.user.id,
        actorRole: session.user.role,
        action: "TOKEN_REFRESHED",
        result: "SUCCESS",
      });
      const csrf =
        parsed.data.clientType === "web"
          ? setWebCookies(app, reply, s.refreshToken)
          : undefined;
      return app.ok(req, {
        ...s,
        refreshToken:
          parsed.data.clientType === "mobile" ? s.refreshToken : undefined,
        csrfToken: csrf,
        user: await authenticatedUserView(app.prisma, session.user),
      });
    },
  );
  app.post("/logout", async (req, reply) => {
    const parsed = refreshSessionSchema.safeParse(req.body ?? {});
    if (!parsed.success)
      return reply
        .code(400)
        .send(app.fail(req, "VALIDATION_ERROR", "Permintaan tidak valid"));
    assertCsrf(req, parsed.data.clientType);
    const token = tokenFrom(req, parsed.data);
    if (token)
      await app.prisma.refreshSession.updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    clearCookies(reply);
    await audit(app.prisma, req, { action: "LOGOUT", result: "SUCCESS" });
    return app.ok(req, { loggedOut: true });
  });
  app.get("/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await app.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: profileInclude,
    });
    if (!user)
      return reply
        .code(404)
        .send(app.fail(req, "USER_NOT_FOUND", "Pengguna tidak ditemukan"));
    return app.ok(req, await authenticatedUserView(app.prisma, user));
  });
}
