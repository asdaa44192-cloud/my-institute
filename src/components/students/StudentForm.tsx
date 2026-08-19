"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { IRAQI_GRADE_LEVELS } from "@/lib/grades";

type StudentDefaults = {
  name?: string;
  grade?: string;
  studentPhone?: string | null;
  parentPhone?: string;
  totalFee?: number;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جارٍ الحفظ..." : label}
    </Button>
  );
}

export function StudentForm({
  action,
  defaults,
  submitLabel = "حفظ الطالب",
}: {
  action: (formData: FormData) => void;
  defaults?: StudentDefaults;
  submitLabel?: string;
}) {
  return (
    <form dir="rtl" action={action} className="space-y-4 text-right">
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

      <SubmitButton label={submitLabel} />
    </form>
  );
}
