import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const configured = process.env.DATABASE_URL ?? "file:./dev.db";
  // Resolve relative file: URLs against the project root, since the dev/build
  // runtime's cwd is not guaranteed to match a plain script's cwd.
  const url = configured.startsWith("file:./")
    ? `file:${path.join(/* turbopackIgnore: true */ process.cwd(), configured.slice("file:./".length))}`
    : configured;
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
