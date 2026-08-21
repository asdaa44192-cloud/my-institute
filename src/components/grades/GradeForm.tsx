"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function GradeForm({
  students,
  subjects,
  action,
}: {
  students: { id: string; name: string; grade: string }[];
  subjects: { id: string; name: string }[];
  action: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (subjects.length === 0) {
    return <p className="text-sm text-muted-foreground">لا توجد مواد دراسية مسندة إليك بعد.</p>;
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await action(formData);
        formRef.current?.reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل تسجيل الدرجة");
      }
    });
  }

  return (
    <form ref={formRef} dir="rtl" action={handleSubmit} className="flex flex-wrap items-end gap-3 text-right">
      <div className="min-w-[180px]">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">الطالب</label>
        <select
          name="studentId"
          required
          className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.grade})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">المادة</label>
        <select
          name="subjectId"
          required
          className="w-full sm:w-36 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">الاختبار</label>
        <input
          name="examName"
          required
          placeholder="اختبار منتصف الفصل"
          className="w-full sm:w-32 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">الدرجة</label>
        <input
          type="number"
          name="score"
          required
          min="0"
          step="0.5"
          className="w-full sm:w-20 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">الدرجة القصوى</label>
        <input
          type="number"
          name="maxScore"
          required
          defaultValue={100}
          min="1"
          step="0.5"
          className="w-full sm:w-20 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الحفظ..." : "إضافة درجة"}
      </Button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
