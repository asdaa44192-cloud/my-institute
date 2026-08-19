"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { assertTeacherCanUseSubject } from "@/lib/actions/subjects";

function startOfDay(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getStudentsByGrade(grade: string) {
  await requireStaff();
  return prisma.student.findMany({
    where: { grade, active: true },
    orderBy: { name: "asc" },
  });
}

export async function getAttendanceForClass(grade: string, subjectId: string, dateStr: string) {
  const user = await requireStaff();
  await assertTeacherCanUseSubject(user.id, user.role, subjectId);

  const date = startOfDay(dateStr);
  const students = await prisma.student.findMany({
    where: { grade, active: true, subjects: { some: { subjectId } } },
    orderBy: { name: "asc" },
  });
  const records = await prisma.attendanceRecord.findMany({
    where: { subjectId, date, student: { grade } },
  });
  const byStudent = new Map(records.map((r) => [r.studentId, r.status]));

  return students.map((s) => ({
    student: s,
    status: byStudent.get(s.id) ?? null,
  }));
}

export async function saveAttendance(
  grade: string,
  subjectId: string,
  dateStr: string,
  statuses: { studentId: string; status: "PRESENT" | "ABSENT" | "LATE" }[]
) {
  const user = await requireStaff();
  await assertTeacherCanUseSubject(user.id, user.role, subjectId);

  const date = startOfDay(dateStr);

  await prisma.$transaction(
    statuses.map(({ studentId, status }) =>
      prisma.attendanceRecord.upsert({
        where: { studentId_date_subjectId: { studentId, date, subjectId } },
        update: { status, recordedById: user.id },
        create: { studentId, date, subjectId, status, recordedById: user.id },
      })
    )
  );

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  statuses.forEach(({ studentId }) => revalidatePath(`/students/${studentId}`));
}
