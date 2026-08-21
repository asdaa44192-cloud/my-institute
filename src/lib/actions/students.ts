"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff, requireStudent, requireUser } from "@/lib/session";
import { getTeacherSubjectIds } from "@/lib/actions/subjects";
import { normalizePhoneDigits, generateRandomPassword } from "@/lib/utils";
import { toSafeError } from "@/lib/db-errors";

const studentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  grade: z.string().min(1, "Grade is required"),
  studentPhone: z.string().optional(),
  parentPhone: z.string().min(1, "Parent phone is required"),
  totalFee: z.coerce.number().min(0),
});

export async function getStudents(params?: { search?: string; grade?: string }) {
  const user = await requireStaff();

  const teacherScope =
    user.role === "TEACHER"
      ? { subjects: { some: { subjectId: { in: await getTeacherSubjectIds(user.id) } } } }
      : {};

  const students = await prisma.student.findMany({
    where: {
      active: true,
      ...teacherScope,
      ...(params?.grade ? { grade: params.grade } : {}),
      ...(params?.search
        ? {
            OR: [
              { name: { contains: params.search } },
              { parentPhone: { contains: params.search } },
            ],
          }
        : {}),
    },
    include: { payments: true },
    orderBy: { name: "asc" },
  });

  return students.map((s) => {
    const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
    return {
      ...s,
      paid,
      remaining: s.totalFee - paid,
      lastPaymentDate: s.payments.length
        ? s.payments.reduce((a, b) => (a.date > b.date ? a : b)).date
        : null,
    };
  });
}

export async function getStudentById(id: string) {
  const user = await requireUser();

  if (user.role === "STUDENT") {
    if (user.studentId !== id) return null;
  } else if (user.role === "TEACHER") {
    const enrolled = await prisma.studentSubject.findFirst({
      where: { studentId: id, subjectId: { in: await getTeacherSubjectIds(user.id) } },
    });
    if (!enrolled) return null;
  }

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      payments: { orderBy: { date: "desc" } },
      attendanceRecords: { orderBy: { date: "desc" }, take: 30, include: { subject: true } },
      gradeRecords: { orderBy: { date: "desc" }, include: { subject: true } },
      subjects: { include: { subject: true } },
    },
  });
  if (!student) return null;

  const paid = student.payments.reduce((sum, p) => sum + p.amount, 0);
  return { ...student, paid, remaining: student.totalFee - paid };
}

/** Student portal: the logged-in student's own profile only. */
export async function getMyStudentProfile() {
  const user = await requireStudent();
  return getStudentById(user.studentId);
}


export async function createStudent(formData: FormData) {
  await requireAdmin();

  const parsed = studentSchema.safeParse({
    name: formData.get("name"),
    grade: formData.get("grade"),
    studentPhone: formData.get("studentPhone") || undefined,
    parentPhone: formData.get("parentPhone"),
    totalFee: formData.get("totalFee"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid student data");
  }

  const student = await prisma.student.create({ data: parsed.data });

  revalidatePath("/students");
  revalidatePath("/dashboard");
  redirect(`/students/${student.id}`);
}

/**
 * Same as createStudent, but optionally provisions a STUDENT login in the same
 * step (when a login phone number + password are both provided) and returns
 * the created record — including the plaintext password — instead of
 * redirecting, so the caller can offer it to the admin once (e.g. to relay
 * over WhatsApp) before it's hashed away for good.
 */
export async function createStudentWithLogin(formData: FormData) {
  await requireAdmin();

  const parsed = studentSchema.safeParse({
    name: formData.get("name"),
    grade: formData.get("grade"),
    studentPhone: formData.get("studentPhone") || undefined,
    parentPhone: formData.get("parentPhone"),
    totalFee: formData.get("totalFee"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid student data");
  }

  const rawLoginPhone = ((formData.get("loginPhone") as string | null) ?? "").trim();
  const rawPassword = (formData.get("password") as string | null) ?? "";
  const wantsLogin = rawLoginPhone !== "" || rawPassword !== "";

  let loginPhone: string | undefined;
  let password: string | undefined;
  if (wantsLogin) {
    const phoneParsed = z
      .string()
      .min(1, "رقم الهاتف مطلوب")
      .refine((v) => normalizePhoneDigits(v).length >= 5, "رقم هاتف غير صالح")
      .safeParse(rawLoginPhone);
    if (!phoneParsed.success) {
      throw new Error(phoneParsed.error.issues[0]?.message ?? "رقم هاتف غير صالح");
    }
    const passwordParsed = z
      .string()
      .min(6, "كلمة المرور يجب أن تتكون من 6 أحرف على الأقل")
      .safeParse(rawPassword);
    if (!passwordParsed.success) {
      throw new Error(passwordParsed.error.issues[0]?.message ?? "كلمة مرور غير صالحة");
    }

    loginPhone = phoneParsed.data;
    password = passwordParsed.data;

    const digits = normalizePhoneDigits(loginPhone);
    const existingPhoneUsers = await prisma.user.findMany({ where: { phone: { not: null } }, select: { phone: true } });
    const clash = existingPhoneUsers.some((u) => normalizePhoneDigits(u.phone!) === digits);
    if (clash) throw new Error("يوجد مستخدم بهذا رقم الهاتف مسبقاً");
  }

  try {
    const student = await prisma.student.create({ data: parsed.data });

    if (loginPhone && password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: {
          name: student.name,
          phone: loginPhone,
          passwordHash,
          activatedAt: new Date(),
          role: "STUDENT",
          studentId: student.id,
        },
      });
    }

    revalidatePath("/students");
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    return {
      id: student.id,
      name: student.name,
      grade: student.grade,
      parentPhone: student.parentPhone,
      studentPhone: student.studentPhone,
      loginPhone,
      password,
    };
  } catch (e) {
    throw toSafeError(e, "فشل إنشاء الطالب");
  }
}

/**
 * Generates a fresh random password for a student's login (creating the
 * login account, keyed on the parent's phone, if one doesn't exist yet) and
 * returns it in plaintext exactly once so the caller can relay it over
 * WhatsApp. Nothing but the bcrypt hash is ever persisted, so this is the
 * only way to get a real, current password for a student — there is no way
 * to read back a password that was set earlier.
 */
export async function resetStudentLoginCredentials(studentId: string) {
  await requireAdmin();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { loginAccount: true },
  });
  if (!student) throw new Error("الطالب غير موجود");

  const password = generateRandomPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  let loginPhone: string;
  try {
    if (student.loginAccount) {
      loginPhone = student.loginAccount.phone ?? student.parentPhone;
      await prisma.user.update({
        where: { id: student.loginAccount.id },
        data: { passwordHash },
      });
    } else {
      loginPhone = student.parentPhone;
      const digits = normalizePhoneDigits(loginPhone);
      const existingPhoneUsers = await prisma.user.findMany({ where: { phone: { not: null } }, select: { phone: true } });
      const clash = existingPhoneUsers.some((u) => normalizePhoneDigits(u.phone!) === digits);
      if (clash) {
        throw new Error("يوجد مستخدم بهذا رقم الهاتف مسبقاً، لا يمكن إنشاء حساب دخول تلقائياً");
      }

      await prisma.user.create({
        data: {
          name: student.name,
          phone: loginPhone,
          passwordHash,
          activatedAt: new Date(),
          role: "STUDENT",
          studentId: student.id,
        },
      });
    }
  } catch (e) {
    throw toSafeError(e, "فشل إعادة تعيين بيانات الدخول");
  }

  revalidatePath("/students");
  revalidatePath("/settings");

  return {
    id: student.id,
    name: student.name,
    grade: student.grade,
    parentPhone: student.parentPhone,
    loginPhone,
    password,
  };
}

export async function updateStudent(id: string, formData: FormData) {
  await requireAdmin();

  const parsed = studentSchema.safeParse({
    name: formData.get("name"),
    grade: formData.get("grade"),
    studentPhone: formData.get("studentPhone") || undefined,
    parentPhone: formData.get("parentPhone"),
    totalFee: formData.get("totalFee"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid student data");
  }

  await prisma.student.update({ where: { id }, data: parsed.data });

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  revalidatePath("/dashboard");
  redirect(`/students/${id}`);
}

export async function deactivateStudent(id: string) {
  await requireAdmin();
  await prisma.student.update({ where: { id }, data: { active: false } });
  revalidatePath("/students");
  revalidatePath("/dashboard");
  redirect("/students");
}

/**
 * Permanently deletes a student and everything scoped to them (payments,
 * attendance, grades, subject enrollments — all cascade via the schema).
 * The linked login, if any, is deleted explicitly first: that FK is
 * ON DELETE SET NULL, so without this the account would survive detached
 * and stay able to log in. getCurrentUser() re-checks the DB on every
 * request, so a deleted user's still-valid JWT stops working immediately.
 */
export async function deleteStudent(id: string) {
  await requireAdmin();
  await prisma.$transaction([
    prisma.user.deleteMany({ where: { studentId: id } }),
    prisma.student.delete({ where: { id } }),
  ]);
  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
}
