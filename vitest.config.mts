import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["./vitest.global-setup.mts"],
    // Multiple test files share one physical SQLite test.db; run files
    // sequentially so their DB-touching beforeEach/afterEach hooks can't race.
    fileParallelism: false,
    env: {
      DATABASE_URL: `file:${path.resolve(import.meta.dirname, "prisma/test.db")}`,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
