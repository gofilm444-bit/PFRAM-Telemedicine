import { describe, it, expect } from "vitest";
import { buildApp } from "../src/app.js";
const env = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://invalid:invalid@127.0.0.1:1/invalid",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  CORS_ORIGINS: "http://localhost:5173",
  COOKIE_SECURE: "false",
};
describe("health", () => {
  it("menjawab health", async () => {
    const app = buildApp({ env });
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe("ok");
    await app.close();
  });
  it("readiness gagal aman tanpa database", async () => {
    const app = buildApp({ env });
    const res = await app.inject({ method: "GET", url: "/api/health/ready" });
    expect(res.statusCode).toBe(503);
    expect(res.json().error.code).toBe("DATABASE_UNAVAILABLE");
    await app.close();
  });
  it("me menolak tanpa token", async () => {
    const app = buildApp({ env });
    const res = await app.inject({ method: "GET", url: "/api/auth/me" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
  it("bidan tidak dapat mengelola wilayah administrator", async () => {
    const app = buildApp({ env });
    await app.ready();
    const token = app.jwt.sign({
      sub: crypto.randomUUID(),
      publicId: crypto.randomUUID(),
      role: "MIDWIFE",
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/regions",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Wilayah Uji", level: "PROVINCE" },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
  it("ibu tidak dapat menetapkan bidan", async () => {
    const app = buildApp({ env });
    await app.ready();
    const token = app.jwt.sign({
      sub: crypto.randomUUID(),
      publicId: crypto.randomUUID(),
      role: "MOTHER",
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/assignments",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});
