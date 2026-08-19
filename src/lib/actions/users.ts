"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { createInvitation } from "@/lib/actions/invitations";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
  phone: z.string().optional(),
  studentId: z.string().optional(),
});

export async function listUsers() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      passwordHash: true,
      inviteTokenExpiresAt: true,
      student: { select: { name: true, parentPhone: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return users.map(({ passwordHash, ...u }) => ({
    ...u,
    hasPassword: !!passwordHash,
  }));
}

export async function createUser(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    phone: formData.get("phone") || undefined,
    studentId: formData.get("studentId") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid user data");
  }
  if (parsed.data.role === "STUDENT" && !parsed.data.studentId) {
    throw new Error("Select which student this login belongs to");
  }
  if (parsed.data.role !== "STUDENT" && !parsed.data.phone) {
    throw new Error("Phone number is required");
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) throw new Error("A user with that email already exists");

  let phone = parsed.data.phone;
  if (parsed.data.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: { id: parsed.data.studentId },
      select: { parentPhone: true },
    });
    phone = student?.parentPhone;
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      phone,
      studentId: parsed.data.role === "STUDENT" ? parsed.data.studentId : undefined,
    },
  });

  void admin;
  revalidatePath("/settings");

  // Never lets a WhatsApp delivery failure roll back or block account creation.
  await createInvitation(user.id);
}

export async function deleteUser(id: string, currentUserId: string) {
  await requireAdmin();
  if (id === currentUserId) throw new Error("You cannot delete your own account");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/settings");
}
