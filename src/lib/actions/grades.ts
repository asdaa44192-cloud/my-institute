"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { computeGradeStats } from "@/lib/grade-stats";
import { assertTeacherCanUseSubject, getTeacherSubjectIds } from "@/lib/actions/subjects";

const gradeSchema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1),
  examName: z.string().min(1),
  score: z.coerce.number().min(0),
  maxScore: z.coerce.number().positive(),
});

export async function addGrade(formData: FormData) {
  const user = await requireStaff();

  const parsed = gradeSchema.safeParse({
    studentId: formData.get("studentId"),
    subjectId: formData.get("subjectId"),
    examName: formData.get("examName"),
    score: formData.get("score"),
    maxScore: formData.get("maxScore"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid grade data");
  }

  await assertTeacherCanUseSubject(user.id, user.role, parsed.data.subjectId);

  await prisma.gradeRecord.create({
    data: { ...parsed.data, recordedById: user.id },
  });

  revalidatePath("/grades");
  revalidatePath(`/students/${parsed.data.studentId}`);
}

export async function getGradesBySubject(subjectId?: string) {
  const user = await requireStaff();

  const teacherScope =
    user.role === "TEACHER" ? { subjectId: { in: await getTeacherSubjectIds(user.id) } } : {};

  return prisma.gradeRecord.findMany({
    where: { ...teacherScope, ...(subjectId ? { subjectId } : {}) },
    include: { student: true, subject: true },
    orderBy: { date: "desc" },
    take: 200,
  });
}

export async function getGradeStatsBySubject() {
  const user = await requireStaff();

  const teacherScope =
    user.role === "TEACHER" ? { subjectId: { in: await getTeacherSubjectIds(user.id) } } : {};

  const records = await prisma.gradeRecord.findMany({
    where: teacherScope,
    select: { subject: { select: { name: true } }, score: true, maxScore: true },
  });
  return computeGradeStats(records.map((r) => ({ subject: r.subject.name, score: r.score, maxScore: r.maxScore })));
}
