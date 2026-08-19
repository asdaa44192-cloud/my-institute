"use server";

import { z } from "zod";
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
