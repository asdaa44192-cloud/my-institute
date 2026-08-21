import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";

const TEST_SCHEMA = "test";

function testDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set (see .env) to run tests");
  }
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set("schema", TEST_SCHEMA);
  return url.toString();
}

export default async function setup() {
  const testUrl = testDatabaseUrl();

  // Drop and recreate the "test" schema so each run starts from a clean
  // slate — fully isolated from "public", where real data lives, so the
  // suite's various deleteMany() resets between tests can never touch it.
  const client = new Client({ connectionString: testUrl });
  await client.connect();
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    await client.query(`CREATE SCHEMA "${TEST_SCHEMA}"`);
  } finally {
    await client.end();
  }

  try {
    // stdio: "inherit" deadlocks here — vitest's globalSetup doesn't give the
    // child a normal inheritable stdout/stderr on Windows, so it blocks
    // forever writing to a pipe nothing is draining. Capture and print
    // instead.
    const output = execSync("npx prisma db push", {
      cwd: import.meta.dirname,
      env: { ...process.env, DATABASE_URL: testUrl },
    });
    console.log(output.toString());
  } catch (e) {
    const err = e as { stdout?: Buffer; stderr?: Buffer };
    console.error(err.stdout?.toString(), err.stderr?.toString());
    throw e;
  }
}
