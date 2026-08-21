import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  // A `?schema=` query param on the URL is only honored by Prisma's own
  // CLI/migration engine (db push, migrate) — the pg driver adapter used here
  // at runtime ignores it and falls back to Postgres's default search_path
  // ("public") unless told explicitly via this option. Without this, a
  // DATABASE_URL pointed at a non-public schema (e.g. tests using "test")
  // would push its schema correctly but every actual query would silently
  // hit "public" instead.
  const schema = new URL(process.env.DATABASE_URL).searchParams.get("schema") ?? undefined;
  const adapter = new PrismaPg(process.env.DATABASE_URL, schema ? { schema } : undefined);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
