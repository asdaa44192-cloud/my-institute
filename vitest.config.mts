import "dotenv/config";
import { defineConfig } from "vitest/config";
import path from "path";

function testDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set (see .env) to run tests");
  }
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set("schema", "test");
  return url.toString();
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["./vitest.global-setup.mts"],
    // Tests share one Postgres "test" schema (isolated from "public", where
    // real data lives); run files sequentially so their DB-touching
    // beforeEach/afterEach hooks can't race each other.
    fileParallelism: false,
    // The DB is now a real network round trip (Supabase) rather than a local
    // SQLite file, so tests making several sequential queries can exceed
    // vitest's 5s default.
    testTimeout: 20000,
    env: {
      DATABASE_URL: testDatabaseUrl(),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
