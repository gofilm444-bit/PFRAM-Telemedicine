import { z } from "zod";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3200),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
});
export type Env = z.infer<typeof schema> & {
  corsOrigins: string[];
  cookieSecure: boolean;
};
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const v = schema.parse(source);
  return {
    ...v,
    corsOrigins: v.CORS_ORIGINS.split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    cookieSecure: v.COOKIE_SECURE === "true",
  };
}
