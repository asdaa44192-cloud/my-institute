"use client";

import { useTransition } from "react";
import {
  assignTeacherToSubject,
  removeTeacherFromSubject,
  enrollStudentInSubject,
  unenrollStudentFromSubject,
} from "@/lib/actions/subjects";

export function TeacherAssignments({
  subjectId,
  allTeachers,
  assignedTeacherIds,
}: {
  subjectId: string;
  allTeachers: { id: string; name: string; email: string }[];
  assignedTeacherIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  const assignedSet = new Set(assignedTeacherIds);

  function toggle(teacherId: string, assigned: boolean) {
    startTransition(async () => {
      if (assigned) await removeTeacherFromSubject(subjectId, teacherId);
      else await assignTeacherToSubject(subjectId, teacherId);
    });
  }

  if (allTeachers.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">لا يوجد معلمون بعد.</p>;
  }

  return (
    <ul className="divide-y divide-border text-sm">
      {allTeachers.map((t) => {
        const assigned = assignedSet.has(t.id);
        return (
          <li key={t.id} className="flex items-center justify-between py-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={assigned}
                disabled={pending}
                onChange={() => toggle(t.id, assigned)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              <span className="font-medium text-foreground">{t.name}</span>
            </label>
            <span className="text-xs text-muted-foreground">{t.email}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function StudentEnrollments({
  subjectId,
  allStudents,
  enrolledStudentIds,
}: {
  subjectId: string;
  allStudents: { id: string; name: string; grade: string }[];
  enrolledStudentIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  const enrolledSet = new Set(enrolledStudentIds);

  function toggle(studentId: string, enrolled: boolean) {
    startTransition(async () => {
      if (enrolled) await unenrollStudentFromSubject(subjectId, studentId);
      else await enrollStudentInSubject(subjectId, studentId);
    });
  }

  if (allStudents.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">لا يوجد طلاب نشطون بعد.</p>;
  }

  return (
    <ul className="max-h-96 divide-y divide-border overflow-y-auto text-sm">
      {allStudents.map((s) => {
        const enrolled = enrolledSet.has(s.id);
        return (
          <li key={s.id} className="flex items-center justify-between py-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enrolled}
                disabled={pending}
                onChange={() => toggle(s.id, enrolled)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              <span className="font-medium text-foreground">{s.name}</span>
            </label>
            <span className="text-xs text-muted-foreground">{s.grade}</span>
          </li>
        );
      })}
    </ul>
  );
}
