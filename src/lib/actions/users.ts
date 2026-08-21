"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { normalizePhoneDigits } from "@/lib/utils";
import { toSafeError } from "@/lib/db-errors";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  /** A single "email or phone" login identifier — see createUser for how it's disambiguated. */
  identifier: z.string().min(1, "Email or phone number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
  /** Required only for STUDENT — validated separately below since it doesn't apply to other roles. */
  grade: z.string().optional(),
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
      student: { select: { name: true, parentPhone: true, grade: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return users.map(({ passwordHash, ...u }) => ({
    ...u,
    hasPassword: !!passwordHash,
  }));
}

/**
 * Single-step account creation for any role. The "identifier" field is
 * disambiguated by format — containing "@" makes it an email, otherwise it's
 * treated as a phone number — so one field covers both login methods.
 *
 * STUDENT registrations create their Student profile inline (grade is
 * required and collected here; parent phone/fee aren't — admins fill those
 * in later from the student's edit page) so no pre-existing profile needs to
 * be picked first, and immediately enroll them in any checked subjects.
 * TEACHER registrations skip the Student profile and instead assign the
 * checked subjects directly.
 */
export async function createUser(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    identifier: formData.get("identifier"),
    password: formData.get("password"),
    role: formData.get("role"),
    grade: formData.get("grade") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid user data");
  }
  if (parsed.data.role === "STUDENT" && !parsed.data.grade) {
    throw new Error("الصف الدراسي مطلوب");
  }

  const rawIdentifier = parsed.data.identifier.trim();
  let email: string | undefined;
  let phone: string | undefined;

  if (rawIdentifier.includes("@")) {
    const emailParsed = z.string().email("Valid email required").safeParse(rawIdentifier);
    if (!emailParsed.success) {
      throw new Error(emailParsed.error.issues[0]?.message ?? "Valid email required");
    }
    email = emailParsed.data.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("A user with that email already exists");
  } else {
    if (normalizePhoneDigits(rawIdentifier).length < 5) {
      throw new Error("رقم هاتف غير صالح");
    }
    phone = rawIdentifier;

    const digits = normalizePhoneDigits(phone);
    const existingPhoneUsers = await prisma.user.findMany({ where: { phone: { not: null } }, select: { phone: true } });
    if (existingPhoneUsers.some((u) => normalizePhoneDigits(u.phone!) === digits)) {
      throw new Error("يوجد مستخدم بهذا رقم الهاتف مسبقاً");
    }
  }

  const subjectIds = formData.getAll("subjectIds").filter((v): v is string => typeof v === "string");
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    await prisma.$transaction(async (tx) => {
      let studentId: string | undefined;
      if (parsed.data.role === "STUDENT") {
        const student = await tx.student.create({
          data: { name: parsed.data.name, grade: parsed.data.grade!, parentPhone: phone ?? "", totalFee: 0 },
        });
        studentId = student.id;
      }

      const user = await tx.user.create({
        data: {
          name: parsed.data.name,
          email,
          phone,
          passwordHash,
          activatedAt: new Date(),
          role: parsed.data.role,
          studentId,
        },
      });

      for (const subjectId of subjectIds) {
        if (parsed.data.role === "STUDENT" && studentId) {
          await tx.studentSubject.upsert({
            where: { studentId_subjectId: { studentId, subjectId } },
            update: {},
            create: { studentId, subjectId },
          });
        } else if (parsed.data.role === "TEACHER") {
          await tx.teacherSubject.upsert({
            where: { teacherId_subjectId: { teacherId: user.id, subjectId } },
            update: {},
            create: { teacherId: user.id, subjectId },
          });
        }
      }
    });
  } catch (e) {
    // The email uniqueness pre-check above closes the common case; this
    // catches the rare concurrent-signup race without leaking Prisma's raw
    // constraint-violation message (which names the column).
    throw toSafeError(e, "A user with that email already exists");
  }

  void admin;
  revalidatePath("/settings");
  revalidatePath("/subjects");
  revalidatePath("/students");
}

export async function deleteUser(id: string, currentUserId: string) {
  await requireAdmin();
  if (id === currentUserId) throw new Error("You cannot delete your own account");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/settings");
}
