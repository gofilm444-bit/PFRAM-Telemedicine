import type { FastifyInstance } from "fastify";
export async function healthRoutes(app: FastifyInstance) {
  app.get("/", async (req) =>
    app.ok(req, {
      status: "ok",
      service: "pfram-api",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    }),
  );
  app.get("/ready", async (req, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return app.ok(req, {
        status: "ok",
        service: "pfram-api",
        version: "0.1.0",
        timestamp: new Date().toISOString(),
        database: "up",
      });
    } catch {
      return reply
        .code(503)
        .send(app.fail(req, "DATABASE_UNAVAILABLE", "Database belum siap"));
    }
  });
}
