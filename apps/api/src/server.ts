import "dotenv/config";
import { buildApp } from "./app.js";
const app = buildApp();
const shutdown = async (signal: string) => {
  app.log.info({ signal }, "graceful_shutdown");
  await app.close();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
app.listen({ host: app.env.HOST, port: app.env.PORT }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
