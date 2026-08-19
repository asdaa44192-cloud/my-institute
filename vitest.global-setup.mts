import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const TEST_DB_PATH = path.resolve(import.meta.dirname, "prisma/test.db");

export default function setup() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = TEST_DB_PATH + suffix;
    if (existsSync(file)) unlinkSync(file);
  }

  execSync("npx prisma migrate deploy", {
    cwd: import.meta.dirname,
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
    stdio: "inherit",
  });
}
