import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

/** Memoized per-request: pages/actions call requireUser/requireStaff etc.
 * repeatedly in the same render, and this avoids re-decoding the session each time. */
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
  if (user.role !== "STUDENT" || !user.studentId) redirect("/dashboard");
  return user as typeof user & { studentId: string };
}
