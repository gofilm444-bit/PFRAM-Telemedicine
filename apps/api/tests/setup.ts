import dotenv from "dotenv";
import path from "node:path";

// Ensure .env is loaded
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const DEFAULT_TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://pfram:pfram_dev_only@localhost:5433/pfram_test?schema=public";

export function assertTestDatabaseSafety(url?: string): void {
  const targetUrl = url || process.env.DATABASE_URL || "";
  if (targetUrl.includes("/pfram_db") || targetUrl.endsWith("/pfram_db")) {
    throw new Error(
      `[SAFETY GUARD VIOLATION] Automated tests must NEVER run against development database 'pfram_db'! ` +
        `Target URL: ${targetUrl}. Please configure TEST_DATABASE_URL to point to 'pfram_test'.`
    );
  }
}

// Automatically enforce test database URL for all tests
if (!process.env.TEST_DATABASE_URL) {
  process.env.TEST_DATABASE_URL = DEFAULT_TEST_DATABASE_URL;
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// Run the safety check immediately upon test runner setup
assertTestDatabaseSafety(process.env.DATABASE_URL);
