import { Prisma } from "@/generated/prisma/client";

const PRISMA_ERROR_TYPES = [
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientValidationError,
];

/**
 * Prisma's own error messages can include raw table/column names (e.g.
 * "Unique constraint failed on the fields: (`email`)") — never let those
 * reach the client. Any other Error is one we threw ourselves with a
 * deliberately safe, user-facing message, so it passes through unchanged.
 *
 * Use this around a create/update call that follows a "does this already
 * exist" pre-check — the pre-check closes the common case, but a concurrent
 * request can still race past it and hit the database constraint directly.
 */
export function toSafeError(error: unknown, fallbackMessage: string): Error {
  if (PRISMA_ERROR_TYPES.some((ctor) => error instanceof ctor)) {
    return new Error(fallbackMessage);
  }
  if (error instanceof Error) return error;
  return new Error(fallbackMessage);
}
