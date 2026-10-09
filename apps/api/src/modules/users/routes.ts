import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcrypt";
import type { Prisma } from "@prisma/client";
import {
  adminUserCreateSchema,
  adminUserFilterSchema,
  adminUserPasswordResetSchema,
} from "@pfram/validation";
import { audit } from "../auth/service.js";
import { formatZodErrorMessage } from "../../shared/validation.js";

export async function userRoutes(app: FastifyInstance) {
  // 1. GET /summary - System overview summary
  app.get(
    "/summary",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (req: FastifyRequest) => {
      const [
        mother,
        midwife,
        admin,
        regions,
        facilities,
        completedProfiles,
        unassigned,
      ] = await Promise.all([
        ...["MOTHER", "MIDWIFE", "ADMIN"].map((role) =>
          app.prisma.user.count({
            where: { role: role as "MOTHER" | "MIDWIFE" | "ADMIN" },
          }),
        ),
        app.prisma.region.count({ where: { active: true } }),
        app.prisma.healthFacility.count({ where: { active: true } }),
        app.prisma.motherProfile.count({ where: { profileCompleted: true } }),
        app.prisma.motherProfile.count({
          where: {
            pregnancies: {
              some: {
                status: "ACTIVE",
                assignments: { none: { status: "ACTIVE" } },
              },
            },
          },
        }),
      ]);
      const auditLogs = await app.prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        select: { action: true, result: true, createdAt: true },
      });
      return app.ok(req, {
        counts: {
          MOTHER: mother,
          MIDWIFE: midwife,
          ADMIN: admin,
          REGIONS: regions,
          FACILITIES: facilities,
          COMPLETED_PROFILES: completedProfiles,
          UNASSIGNED: unassigned,
        },
        audit: auditLogs,
      });
    },
  );

  // 2. GET / - List users with safe operational metadata & pagination
  app.get(
    "/",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = adminUserFilterSchema.safeParse(req.query);
      if (!parsed.success) {
        return reply
          .code(400)
          .send(
            app.fail(
              req,
              "VALIDATION_ERROR",
              formatZodErrorMessage(parsed.error),
              parsed.error.flatten(),
            ),
          );
      }
      const q = parsed.data;
      const page = q.page ?? 1;
      const limit = q.limit ?? 20;
      const skip = (page - 1) * limit;

      const where: Prisma.UserWhereInput = {};
      if (q.role) where.role = q.role;
      if (q.status) where.status = q.status;
      if (q.search && q.search.trim()) {
        const s = q.search.trim();
        where.OR = [
          { phoneNumber: { contains: s, mode: "insensitive" } },
          { adminProfile: { fullName: { contains: s, mode: "insensitive" } } },
          { midwifeProfile: { fullName: { contains: s, mode: "insensitive" } } },
          { motherProfile: { fullName: { contains: s, mode: "insensitive" } } },
        ];
      }

      const [total, users] = await Promise.all([
        app.prisma.user.count({ where }),
        app.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            publicId: true,
            phoneNumber: true,
            role: true,
            status: true,
            failedLoginCount: true,
            lockedUntil: true,
            lastLoginAt: true,
            createdAt: true,
            deactivatedAt: true,
            adminProfile: { select: { fullName: true } },
            midwifeProfile: { select: { fullName: true } },
            motherProfile: { select: { fullName: true } },
          },
        }),
      ]);

      const now = new Date();
      const items = users.map((u) => {
        const isLocked = u.lockedUntil != null && new Date(u.lockedUntil) > now;
        const fullName =
          u.adminProfile?.fullName ??
          u.midwifeProfile?.fullName ??
          u.motherProfile?.fullName ??
          null;
        const displayName = fullName ?? u.phoneNumber;

        return {
          publicId: u.publicId,
          phoneNumber: u.phoneNumber,
          role: u.role,
          status: u.status,
          displayName,
          fullName,
          lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
          failedLoginCount: u.failedLoginCount,
          lockedUntil: u.lockedUntil ? u.lockedUntil.toISOString() : null,
          isLocked,
          createdAt: u.createdAt.toISOString(),
          deactivatedAt: u.deactivatedAt ? u.deactivatedAt.toISOString() : null,
        };
      });

      return app.ok(req, { items, total, page, pageSize: limit });
    },
  );

  // 3. POST / - Create user account (ADMIN or MIDWIFE with respective Profile)
  app.post(
    "/",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = adminUserCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send(
            app.fail(
              req,
              "VALIDATION_ERROR",
              formatZodErrorMessage(parsed.error),
              parsed.error.flatten(),
            ),
          );
      }
      const data = parsed.data;

      // Duplicate phone check
      const existing = await app.prisma.user.findUnique({
        where: { phoneNumber: data.phoneNumber },
      });
      if (existing) {
        return reply
          .code(409)
          .send(
            app.fail(
              req,
              "PHONE_ALREADY_EXISTS",
              "Nomor HP sudah terdaftar di sistem",
            ),
          );
      }

      // Facility lookup for midwife if provided
      let facilityId: string | null = null;
      if (data.role === "MIDWIFE" && data.primaryFacilityPublicId) {
        const fac = await app.prisma.healthFacility.findUnique({
          where: { publicId: data.primaryFacilityPublicId },
        });
        if (!fac) {
          return reply
            .code(404)
            .send(
              app.fail(
                req,
                "FACILITY_NOT_FOUND",
                "Fasilitas kesehatan tidak ditemukan",
              ),
            );
        }
        facilityId = fac.id;
      }

      const passwordHash = await bcrypt.hash(data.password, 12);

      const user = await app.prisma.$transaction(async (tx) => {
        return tx.user.create({
          data: {
            phoneNumber: data.phoneNumber,
            passwordHash,
            role: data.role,
            status: "ACTIVE",
            ...(data.role === "ADMIN"
              ? {
                  adminProfile: {
                    create: {
                      fullName: data.fullName,
                    },
                  },
                }
              : {
                  midwifeProfile: {
                    create: {
                      fullName: data.fullName,
                      phoneNumber: data.phoneNumber,
                      active: true,
                      ...(facilityId ? { primaryFacilityId: facilityId } : {}),
                      ...(data.professionalRegistrationNumber
                        ? {
                            professionalRegistrationNumber:
                              data.professionalRegistrationNumber,
                          }
                        : {}),
                    },
                  },
                }),
          },
          select: {
            id: true,
            publicId: true,
            phoneNumber: true,
            role: true,
            status: true,
            createdAt: true,
          },
        });
      });

      await audit(app.prisma, req, {
        actorUserId: req.user.sub,
        actorRole: req.user.role,
        action: "USER_CREATED",
        result: "SUCCESS",
        entityType: "User",
        entityId: user.id,
        metadata: {
          publicId: user.publicId,
          role: user.role,
          phoneNumber: user.phoneNumber,
        },
      });

      return reply.code(201).send(
        app.ok(req, {
          publicId: user.publicId,
          phoneNumber: user.phoneNumber,
          role: user.role,
          status: user.status,
          displayName: data.fullName,
          createdAt: user.createdAt.toISOString(),
        }),
      );
    },
  );

  // 4. GET /:publicId - Get user account detail
  app.get(
    "/:publicId",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { publicId } = req.params as { publicId: string };
      const u = await app.prisma.user.findUnique({
        where: { publicId },
        select: {
          id: true,
          publicId: true,
          phoneNumber: true,
          role: true,
          status: true,
          failedLoginCount: true,
          lockedUntil: true,
          lastLoginAt: true,
          createdAt: true,
          deactivatedAt: true,
          adminProfile: { select: { fullName: true } },
          midwifeProfile: {
            select: {
              fullName: true,
              professionalRegistrationNumber: true,
              primaryFacility: { select: { publicId: true, name: true } },
            },
          },
          motherProfile: {
            select: {
              fullName: true,
              primaryFacility: { select: { publicId: true, name: true } },
            },
          },
        },
      });
      if (!u) {
        return reply
          .code(404)
          .send(app.fail(req, "USER_NOT_FOUND", "Pengguna tidak ditemukan"));
      }

      const now = new Date();
      const isLocked = u.lockedUntil != null && new Date(u.lockedUntil) > now;
      const fullName =
        u.adminProfile?.fullName ??
        u.midwifeProfile?.fullName ??
        u.motherProfile?.fullName ??
        null;

      return app.ok(req, {
        publicId: u.publicId,
        phoneNumber: u.phoneNumber,
        role: u.role,
        status: u.status,
        displayName: fullName ?? u.phoneNumber,
        fullName,
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        failedLoginCount: u.failedLoginCount,
        lockedUntil: u.lockedUntil ? u.lockedUntil.toISOString() : null,
        isLocked,
        createdAt: u.createdAt.toISOString(),
        deactivatedAt: u.deactivatedAt ? u.deactivatedAt.toISOString() : null,
        midwifeProfile: u.midwifeProfile ?? undefined,
        motherProfile: u.motherProfile
          ? {
              fullName: u.motherProfile.fullName,
              primaryFacility: u.motherProfile.primaryFacility,
            }
          : undefined,
      });
    },
  );

  // 5. POST /:publicId/activate - Activate account
  app.post(
    "/:publicId/activate",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { publicId } = req.params as { publicId: string };
      const user = await app.prisma.user.findUnique({ where: { publicId } });
      if (!user) {
        return reply
          .code(404)
          .send(app.fail(req, "USER_NOT_FOUND", "Pengguna tidak ditemukan"));
      }

      await app.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { status: "ACTIVE", deactivatedAt: null },
        });
        if (user.role === "MIDWIFE") {
          await tx.midwifeProfile.updateMany({
            where: { userId: user.id },
            data: { active: true },
          });
        }
      });

      await audit(app.prisma, req, {
        actorUserId: req.user.sub,
        actorRole: req.user.role,
        action: "USER_ACTIVATED",
        result: "SUCCESS",
        entityType: "User",
        entityId: user.id,
        metadata: { publicId: user.publicId, role: user.role },
      });

      return app.ok(req, {
        publicId: user.publicId,
        status: "ACTIVE",
        message: "Akun berhasil diaktifkan",
      });
    },
  );

  // 6. POST /:publicId/deactivate - Deactivate account
  app.post(
    "/:publicId/deactivate",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { publicId } = req.params as { publicId: string };
      const user = await app.prisma.user.findUnique({ where: { publicId } });
      if (!user) {
        return reply
          .code(404)
          .send(app.fail(req, "USER_NOT_FOUND", "Pengguna tidak ditemukan"));
      }

      // Prevent disabling own account
      if (req.user.sub === user.id) {
        return reply
          .code(400)
          .send(
            app.fail(
              req,
              "CANNOT_DEACTIVATE_SELF",
              "Anda tidak dapat menonaktifkan akun sendiri",
            ),
          );
      }

      // Prevent disabling the last active admin
      if (user.role === "ADMIN") {
        const activeAdminCount = await app.prisma.user.count({
          where: { role: "ADMIN", status: "ACTIVE" },
        });
        if (activeAdminCount <= 1) {
          return reply
            .code(400)
            .send(
              app.fail(
                req,
                "LAST_ACTIVE_ADMIN",
                "Tidak dapat menonaktifkan satu-satunya administrator yang aktif",
              ),
            );
        }
      }

      await app.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { status: "DISABLED", deactivatedAt: new Date() },
        });
        if (user.role === "MIDWIFE") {
          await tx.midwifeProfile.updateMany({
            where: { userId: user.id },
            data: { active: false },
          });
        }
        // Revoke active sessions
        await tx.refreshSession.deleteMany({
          where: { userId: user.id },
        });
      });

      await audit(app.prisma, req, {
        actorUserId: req.user.sub,
        actorRole: req.user.role,
        action: "USER_DEACTIVATED",
        result: "SUCCESS",
        entityType: "User",
        entityId: user.id,
        metadata: { publicId: user.publicId, role: user.role },
      });

      return app.ok(req, {
        publicId: user.publicId,
        status: "DISABLED",
        message: "Akun berhasil dinonaktifkan",
      });
    },
  );

  // 7. POST /:publicId/unlock - Reset lock
  app.post(
    "/:publicId/unlock",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { publicId } = req.params as { publicId: string };
      const user = await app.prisma.user.findUnique({ where: { publicId } });
      if (!user) {
        return reply
          .code(404)
          .send(app.fail(req, "USER_NOT_FOUND", "Pengguna tidak ditemukan"));
      }

      await app.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });

      await audit(app.prisma, req, {
        actorUserId: req.user.sub,
        actorRole: req.user.role,
        action: "USER_UNLOCKED",
        result: "SUCCESS",
        entityType: "User",
        entityId: user.id,
        metadata: { publicId: user.publicId },
      });

      return app.ok(req, {
        publicId: user.publicId,
        isLocked: false,
        message: "Kunci akun berhasil dibuka",
      });
    },
  );

  // 8. POST /:publicId/reset-password - Password reset
  app.post(
    "/:publicId/reset-password",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { publicId } = req.params as { publicId: string };
      const user = await app.prisma.user.findUnique({ where: { publicId } });
      if (!user) {
        return reply
          .code(404)
          .send(app.fail(req, "USER_NOT_FOUND", "Pengguna tidak ditemukan"));
      }

      const parsed = adminUserPasswordResetSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send(
            app.fail(
              req,
              "VALIDATION_ERROR",
              formatZodErrorMessage(parsed.error),
              parsed.error.flatten(),
            ),
          );
      }

      const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);

      await app.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            failedLoginCount: 0,
            lockedUntil: null,
          },
        });
        // Revoke all refresh sessions
        await tx.refreshSession.deleteMany({
          where: { userId: user.id },
        });
      });

      await audit(app.prisma, req, {
        actorUserId: req.user.sub,
        actorRole: req.user.role,
        action: "USER_PASSWORD_RESET",
        result: "SUCCESS",
        entityType: "User",
        entityId: user.id,
        metadata: { publicId: user.publicId },
      });

      return app.ok(req, {
        publicId: user.publicId,
        message: "Kata sandi berhasil direset dan sesi aktif dicabut",
      });
    },
  );
}
