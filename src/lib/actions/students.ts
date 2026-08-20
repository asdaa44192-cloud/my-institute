"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff, requireStudent, requireUser } from "@/lib/session";
import { getTeacherSubjectIds } from "@/lib/actions/subjects";

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

/** Active students with no linked login yet, for the "create a student login" picker. */
export async function listStudentsWithoutLogin() {
  await requireAdmin();
  return prisma.student.findMany({
    where: { active: true, loginAccount: null },
    select: { id: true, name: true, grade: true },
    orderBy: { name: "asc" },
  });
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
 * step (when email + password are both provided) and returns the created
 * record — including the plaintext password — instead of redirecting, so the
 * caller can offer it to the admin once (e.g. to relay over WhatsApp) before
 * it's hashed away for good.
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

  const rawEmail = ((formData.get("email") as string | null) ?? "").trim();
  const rawPassword = (formData.get("password") as string | null) ?? "";
  const wantsLogin = rawEmail !== "" || rawPassword !== "";

  let email: string | undefined;
  let password: string | undefined;
  if (wantsLogin) {
    const emailParsed = z.string().email("البريد الإلكتروني غير صالح").safeParse(rawEmail);
    if (!emailParsed.success) {
      throw new Error(emailParsed.error.issues[0]?.message ?? "البريد الإلكتروني غير صالح");
    }
    const passwordParsed = z
      .string()
      .min(6, "كلمة المرور يجب أن تتكون من 6 أحرف على الأقل")
      .safeParse(rawPassword);
    if (!passwordParsed.success) {
      throw new Error(passwordParsed.error.issues[0]?.message ?? "كلمة مرور غير صالحة");
    }

    email = emailParsed.data.toLowerCase();
    password = passwordParsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("يوجد مستخدم بهذا البريد الإلكتروني مسبقاً");
  }

  const student = await prisma.student.create({ data: parsed.data });

  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name: student.name,
        email,
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
    email,
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
