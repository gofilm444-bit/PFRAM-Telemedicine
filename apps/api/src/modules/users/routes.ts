import type { FastifyInstance } from "fastify";
export async function userRoutes(app: FastifyInstance) {
  app.get(
    "/summary",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (req) => {
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
      const audit = await app.prisma.auditLog.findMany({
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
        audit,
      });
    },
  );
}
