import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Bootstraps the master admin account if it doesn't exist yet. Only ever
 * creates — never touches the password of an account that's already there,
 * so a later manual password change (or reset via the invite flow) sticks.
 */
export async function ensureAdminAccount() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("Skipping admin bootstrap: ADMIN_EMAIL/ADMIN_PASSWORD not set");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name: "Admin", email, passwordHash, role: "ADMIN" },
  });
  console.log(`Bootstrapped master admin account: ${email}`);
}
