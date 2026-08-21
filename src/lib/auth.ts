import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizePhoneDigits } from "@/lib/utils";
import { recordLoginAttempt, clearLoginAttempts } from "@/lib/rate-limit";

/** Looks a user up by email (if the identifier looks like one) or by phone otherwise. */
async function findUserByIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    return prisma.user.findUnique({ where: { email: trimmed.toLowerCase() } });
  }

  const digits = normalizePhoneDigits(trimmed);
  if (!digits) return null;

  const candidates = await prisma.user.findMany({ where: { phone: { not: null } } });
  return candidates.find((c) => normalizePhoneDigits(c.phone!) === digits) ?? null;
}

/** Same normalization findUserByIdentifier uses, so "+1 (555) 000-1111" and
 * "15550001111" — or any other formatting of the same phone — share one
 * rate-limit bucket instead of each getting their own 5 free guesses. */
function rateLimitKeyFor(identifier: string) {
  const trimmed = identifier.trim();
  return trimmed.includes("@") ? trimmed.toLowerCase() : normalizePhoneDigits(trimmed);
}

/** Exported standalone so it's directly unit-testable without NextAuth's provider plumbing. */
export async function authorizeCredentials(credentials: Record<"identifier" | "password", string> | undefined) {
  if (!credentials?.identifier || !credentials?.password) return null;

  // Keyed by the identifier being targeted (not by IP, which would need a
  // trusted reverse proxy to be meaningful) so a sustained guessing attempt
  // against one account is throttled regardless of where it's coming from.
  // This runs before the DB lookup, so it applies equally to real and
  // made-up identifiers — the "too many attempts" message never reveals
  // whether an account exists.
  const rateLimitKey = rateLimitKeyFor(credentials.identifier);
  const { allowed, retryAfterSeconds } = recordLoginAttempt(rateLimitKey);
  if (!allowed) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    throw new Error(`محاولات تسجيل دخول كثيرة جداً. حاول مرة أخرى بعد ${minutes} ${minutes === 1 ? "دقيقة" : "دقائق"}.`);
  }

  const user = await findUserByIdentifier(credentials.identifier);
  if (!user || !user.passwordHash) return null;

  const valid = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!valid) return null;

  clearLoginAttempts(rateLimitKey);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.studentId,
  };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { role: "ADMIN" | "TEACHER" | "STUDENT"; studentId?: string | null };
        token.role = u.role;
        token.studentId = u.studentId;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // The JWT itself stays valid until it expires (30 days by default), so
      // trusting its embedded role/studentId would let a deleted account keep
      // its session, or a demoted admin (role changed directly in the DB —
      // there's no in-app "change role" action) keep ADMIN access, for the
      // rest of that window. Re-reading both on every session check closes
      // that gap immediately, at the cost of one extra query per request —
      // the same trip getCurrentUser() was already making just to check
      // existence, so this reuses it instead of adding a second one.
      const current = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { id: true, role: true, studentId: true },
      });
      if (!current) {
        return { ...session, user: undefined } as unknown as typeof session;
      }

      if (session.user) {
        session.user.role = current.role;
        session.user.studentId = current.studentId;
        session.user.id = current.id;
      }
      return session;
    },
  },
};
