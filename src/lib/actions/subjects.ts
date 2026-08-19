"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";

export async function getTeacherSubjectIds(teacherId: string) {
  const rows = await prisma.teacherSubject.findMany({
    where: { teacherId },
    select: { subjectId: true },
  });
  return rows.map((r) => r.subjectId);
}

/** Throws unless the teacher is assigned to this subject. No-op for ADMIN. */
export async function assertTeacherCanUseSubject(userId: string, role: string, subjectId: string) {
  if (role !== "TEACHER") return;
  const assigned = await prisma.teacherSubject.findUnique({
    where: { teacherId_subjectId: { teacherId: userId, subjectId } },
  });
  if (!assigned) throw new Error("You are not assigned to this subject");
}

export async function listSubjects() {
  await requireAdmin();
  return prisma.subject.findMany({
    include: { _count: { select: { teachers: true, enrollments: true } } },
    orderBy: { name: "asc" },
  });
}

/** ADMIN sees every subject; TEACHER sees only what they're assigned to; STUDENT sees none here. */
export async function getSubjectsForCurrentUser() {
  const user = await requireUser();
  if (user.role === "ADMIN") {
    return prisma.subject.findMany({ orderBy: { name: "asc" } });
  }
  if (user.role === "TEACHER") {
    return prisma.subject.findMany({
      where: { teachers: { some: { teacherId: user.id } } },
      orderBy: { name: "asc" },
    });
  }
  return [];
}

const subjectSchema = z.object({ name: z.string().min(1, "Subject name is required") });

export async function createSubject(formData: FormData) {
  await requireAdmin();
  const parsed = subjectSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid subject data");

  const existing = await prisma.subject.findUnique({ where: { name: parsed.data.name } });
  if (existing) throw new Error("A subject with that name already exists");

  await prisma.subject.create({ data: { name: parsed.data.name } });
  revalidatePath("/subjects");
}

export async function deleteSubject(id: string) {
  await requireAdmin();
  try {
    await prisma.subject.delete({ where: { id } });
  } catch {
    throw new Error("لا يمكن حذف مادة لها سجلات درجات أو حضور سابقة");
  }
  revalidatePath("/subjects");
}

export async function getSubjectDetail(id: string) {
  await requireAdmin();
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      teachers: { include: { teacher: { select: { id: true, name: true, email: true } } } },
      enrollments: { include: { student: { select: { id: true, name: true, grade: true } } } },
    },
  });
  if (!subject) return null;

  const [allTeachers, allStudents] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TEACHER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: { active: true },
      select: { id: true, name: true, grade: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { subject, allTeachers, allStudents };
}

export async function assignTeacherToSubject(subjectId: string, teacherId: string) {
  await requireAdmin();
  await prisma.teacherSubject.upsert({
    where: { teacherId_subjectId: { teacherId, subjectId } },
    update: {},
    create: { teacherId, subjectId },
  });
  revalidatePath(`/subjects/${subjectId}`);
}

export async function removeTeacherFromSubject(subjectId: string, teacherId: string) {
  await requireAdmin();
  await prisma.teacherSubject.delete({ where: { teacherId_subjectId: { teacherId, subjectId } } });
  revalidatePath(`/subjects/${subjectId}`);
}

export async function enrollStudentInSubject(subjectId: string, studentId: string) {
  await requireAdmin();
  await prisma.studentSubject.upsert({
    where: { studentId_subjectId: { studentId, subjectId } },
    update: {},
    create: { studentId, subjectId },
  });
  revalidatePath(`/subjects/${subjectId}`);
}

export async function unenrollStudentFromSubject(subjectId: string, studentId: string) {
  await requireAdmin();
  await prisma.studentSubject.delete({ where: { studentId_subjectId: { studentId, subjectId } } });
  revalidatePath(`/subjects/${subjectId}`);
}
