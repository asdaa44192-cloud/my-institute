"use client";

import { useState, useTransition } from "react";
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
  allTeachers: { id: string; name: string; email: string | null }[];
  assignedTeacherIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const assignedSet = new Set(assignedTeacherIds);

  function toggle(teacherId: string, assigned: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        if (assigned) await removeTeacherFromSubject(subjectId, teacherId);
        else await assignTeacherToSubject(subjectId, teacherId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل تحديث تعيين المعلم");
      }
    });
  }

  if (allTeachers.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">لا يوجد معلمون بعد.</p>;
  }

  return (
    <div>
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
      {error && <p className="pt-2 text-xs text-red-600">{error}</p>}
    </div>
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
  const [error, setError] = useState<string | null>(null);
  const enrolledSet = new Set(enrolledStudentIds);

  function toggle(studentId: string, enrolled: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        if (enrolled) await unenrollStudentFromSubject(subjectId, studentId);
        else await enrollStudentInSubject(subjectId, studentId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل تحديث تسجيل الطالب");
      }
    });
  }

  if (allStudents.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">لا يوجد طلاب نشطون بعد.</p>;
  }

  return (
    <div>
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
      {error && <p className="pt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
