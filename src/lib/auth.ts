import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/** Looks a user up by email (if the identifier looks like one) or by phone otherwise. */
async function findUserByIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    return prisma.user.findUnique({ where: { email: trimmed.toLowerCase() } });
  }

  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return null;

  const candidates = await prisma.user.findMany({ where: { phone: { not: null } } });
  return candidates.find((c) => c.phone!.replace(/[^\d]/g, "") === digits) ?? null;
}

/** Exported standalone so it's directly unit-testable without NextAuth's provider plumbing. */
export async function authorizeCredentials(credentials: Record<"identifier" | "password", string> | undefined) {
  if (!credentials?.identifier || !credentials?.password) return null;

  const user = await findUserByIdentifier(credentials.identifier);
  if (!user || !user.passwordHash) return null;

  const valid = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!valid) return null;

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
      if (session.user) {
        session.user.role = token.role as "ADMIN" | "TEACHER" | "STUDENT";
        session.user.studentId = token.studentId as string | null | undefined;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
