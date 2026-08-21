"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IRAQI_GRADE_LEVELS } from "@/lib/grades";

type StudentDefaults = {
  name?: string;
  grade?: string;
  studentPhone?: string | null;
  parentPhone?: string;
  totalFee?: number;
};

export function StudentForm({
  action,
  defaults,
  submitLabel = "حفظ الطالب",
}: {
  /** Redirects on success (via next/navigation's redirect()) — handleSubmit
   * below must let that special throw pass through unstable_rethrow rather
   * than treat it as a form error. */
  action: (formData: FormData) => Promise<void>;
  defaults?: StudentDefaults;
  submitLabel?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await action(formData);
      } catch (e) {
        unstable_rethrow(e);
        setError(e instanceof Error ? e.message : "فشل حفظ بيانات الطالب");
      }
    });
  }

  return (
    <form dir="rtl" action={handleSubmit} className="space-y-4 text-right">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">الاسم الكامل</label>
          <input
            name="name"
            required
            defaultValue={defaults?.name}
            className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">الصف / المرحلة</label>
          <select
            name="grade"
            required
            defaultValue={defaults?.grade ?? ""}
            className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          >
            <option value="" disabled>
              اختر الصف
            </option>
            {/* The student's stored grade may predate the current grade list, or be a
             * one-off custom value. Without this, the select would silently fall back to
             * the disabled placeholder, and saving any other field would either get
             * blocked by the required constraint or — worse — overwrite the grade. */}
            {defaults?.grade && !(IRAQI_GRADE_LEVELS as readonly string[]).includes(defaults.grade) && (
              <option value={defaults.grade}>{defaults.grade} (غير مدرج)</option>
            )}
            {IRAQI_GRADE_LEVELS.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">هاتف الطالب</label>
          <input
            name="studentPhone"
            placeholder="اختياري"
            defaultValue={defaults?.studentPhone ?? ""}
            className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">هاتف ولي الأمر</label>
          <input
            name="parentPhone"
            required
            placeholder="+1555..."
            defaultValue={defaults?.parentPhone}
            className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">إجمالي الرسوم الدراسية ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="totalFee"
            required
            defaultValue={defaults?.totalFee}
            className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الحفظ..." : submitLabel}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
