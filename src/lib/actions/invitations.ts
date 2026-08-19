"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { sendWhatsAppMessage } from "@/lib/twilio";
import { inviteMessage } from "@/lib/whatsapp";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Admin-only. Also doubles as "reset password": invalidates any existing
 * password immediately, then dispatches a fresh setup link over WhatsApp via
 * Twilio. A failed/unconfigured send never throws — the caller still gets
 * back a usable link to relay manually.
 */
export async function createInvitation(userId: string) {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { student: { select: { parentPhone: true } } },
  });
  if (!user) throw new Error("User not found");

  const token = randomBytes(32).toString("hex");
  const inviteTokenExpiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: null, inviteToken: token, inviteTokenExpiresAt },
  });

  revalidatePath("/settings");

  const phone = user.phone ?? user.student?.parentPhone ?? null;
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const url = `${baseUrl}/invite/${token}`;
  const isReset = !!user.activatedAt;

  let sent = false;
  if (phone) {
    const result = await sendWhatsAppMessage(phone, inviteMessage({ name: user.name, url, isReset }));
    sent = result.ok;
  }

  return { token, url, sent, expiresAt: inviteTokenExpiresAt };
}

const passwordSchema = z.string().min(6, "كلمة المرور يجب أن تتكون من 6 أحرف على الأقل");

/** No auth guard — runs for a not-yet-logged-in user completing their invite link. */
export async function completeInvitation(token: string, password: string) {
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) {
    throw new Error(parsedPassword.error.issues[0]?.message ?? "كلمة مرور غير صالحة");
  }

  const user = await prisma.user.findFirst({
    where: { inviteToken: token, inviteTokenExpiresAt: { gt: new Date() } },
  });
  if (!user) {
    throw new Error("رابط الدعوة غير صالح أو منتهي الصلاحية");
  }

  const passwordHash = await bcrypt.hash(parsedPassword.data, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      inviteToken: null,
      inviteTokenExpiresAt: null,
      activatedAt: new Date(),
    },
  });

  return { email: user.email };
}
