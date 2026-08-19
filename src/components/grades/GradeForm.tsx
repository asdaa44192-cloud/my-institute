"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جارٍ الحفظ..." : "إضافة درجة"}
    </Button>
  );
}

export function GradeForm({
  students,
  subjects,
  action,
}: {
  students: { id: string; name: string; grade: string }[];
  subjects: { id: string; name: string }[];
  action: (formData: FormData) => void;
}) {
  if (subjects.length === 0) {
    return <p className="text-sm text-muted-foreground">لا توجد مواد دراسية مسندة إليك بعد.</p>;
  }

  return (
    <form dir="rtl" action={action} className="flex flex-wrap items-end gap-3 text-right">
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
      <SubmitButton />
    </form>
  );
}
