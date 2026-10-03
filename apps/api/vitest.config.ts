import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 20000,
    fileParallelism: false,
    setupFiles: ["./tests/setup.ts"],
  },
});
