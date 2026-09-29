import bcrypt from "bcrypt";
import type { Prisma, PrismaClient, User, UserRole } from "@prisma/client";
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  hashToken,
  newOpaqueToken,
  sanitizeAuditMetadata,
} from "../../shared/security.js";
import { profileCompletion } from "../stage3/service.js";

export const publicUser = (
  u: User & {
    motherProfile?: { fullName: string } | null;
    midwifeProfile?: { fullName: string } | null;
    adminProfile?: { fullName: string } | null;
  },
) => ({
  publicId: u.publicId,
  phoneNumber: u.phoneNumber,
  role: u.role,
  status: u.status,
  displayName:
    u.motherProfile?.fullName ??
    u.midwifeProfile?.fullName ??
    u.adminProfile?.fullName ??
    "Pengguna PFRAM",
  phoneVerifiedAt: u.phoneVerifiedAt?.toISOString() ?? null,
});

export async function authenticatedUserView(
  prisma: PrismaClient,
  u: User & {
    motherProfile?: { fullName: string } | null;
    midwifeProfile?: { fullName: string } | null;
    adminProfile?: { fullName: string } | null;
  },
) {
  const base = publicUser(u);
  if (u.role !== "MOTHER") return base;
  const completion = await profileCompletion(prisma, u.id);
  return {
    ...base,
    profileCompletionStatus: completion.status,
    profileCompleted: completion.profileCompleted,
    activePregnancy: completion.activePregnancy,
    selectedFacility: completion.selectedFacility,
    activeMidwifeAssignment: completion.activeMidwifeAssignment,
  };
}
export async function audit(
  prisma: PrismaClient,
  req: FastifyRequest,
  event: {
    actorUserId?: string;
    actorRole?: UserRole;
    action: string;
    result: "SUCCESS" | "FAILED";
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await prisma.auditLog
    .create({
      data: {
        ...(event.actorUserId ? { actorUserId: event.actorUserId } : {}),
        ...(event.actorRole ? { actorRole: event.actorRole } : {}),
        action: event.action,
        ...(event.entityType ? { entityType: event.entityType } : {}),
        ...(event.entityId ? { entityId: event.entityId } : {}),
        result: event.result,
        requestId: req.id,
        ...(event.metadata
          ? {
              metadata: sanitizeAuditMetadata(
                event.metadata,
              ) as Prisma.InputJsonValue,
            }
          : {}),
      },
    })
    .catch(() => undefined);
}
export async function issueSession(
  app: FastifyInstance,
  user: User,
  req: FastifyRequest,
) {
  const accessToken = app.jwt.sign(
    { sub: user.id, publicId: user.publicId, role: user.role },
    { expiresIn: app.env.ACCESS_TOKEN_TTL },
  );
  const refreshToken = newOpaqueToken();
  await app.prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + app.env.REFRESH_TOKEN_DAYS * 86400000),
      ipAddress: req.ip,
    },
  });
  return { accessToken, refreshToken, expiresIn: 900 };
}
export async function verifyPassword(user: User, password: string) {
  return bcrypt.compare(password, user.passwordHash);
}
