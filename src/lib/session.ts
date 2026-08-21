import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

/** Memoized per-request: pages/actions call requireUser/requireStaff etc.
 * repeatedly in the same render, and this avoids re-decoding the session each time.
 * (A deleted user's session is invalidated in authOptions' `session` callback,
 * which re-checks the database on every call — see src/lib/auth.ts.) */
export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
});

/** Redirects to /login if not authenticated. Use in page/layout Server Components. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects non-admins away. Use for financial/settings pages and Server Actions. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/** Redirects students away. Use for attendance/grade entry — a teaching duty, not a student one. */
export async function requireStaff() {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "TEACHER") redirect("/dashboard");
  return user;
}

/** Redirects non-students away. Use for the student portal's own data. */
export async function requireStudent() {
  const user = await requireUser();
  if (user.role !== "STUDENT") redirect("/dashboard");
  // A STUDENT with no linked Student profile shouldn't be possible through any
  // in-app action, but if that invariant is ever violated (e.g. a role edited
  // directly in the DB), redirecting to /dashboard — this function's only
  // caller — would just loop forever. /login is a safe dead end instead.
  if (!user.studentId) redirect("/login");
  return user as typeof user & { studentId: string };
}
