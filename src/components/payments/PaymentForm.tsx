"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { formatDateInput } from "@/lib/utils";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جارٍ التسجيل..." : "تسجيل الدفعة"}
    </Button>
  );
}

export function PaymentForm({
  studentId,
  action,
}: {
  studentId: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form dir="rtl" action={action} className="flex flex-wrap items-end gap-3 text-right">
      <input type="hidden" name="studentId" value={studentId} />
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">المبلغ ($)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          name="amount"
          required
          className="w-full sm:w-32 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">التاريخ</label>
        <input
          type="date"
          name="date"
          required
          defaultValue={formatDateInput(new Date())}
          className="rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">طريقة الدفع</label>
        <select
          name="method"
          defaultValue="cash"
          className="rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        >
          <option value="cash">نقدًا</option>
          <option value="bank_transfer">تحويل بنكي</option>
          <option value="card">بطاقة</option>
          <option value="other">أخرى</option>
        </select>
      </div>
      <div className="flex-1 min-w-[150px]">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">ملاحظة</label>
        <input
          name="note"
          placeholder="اختياري"
          className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
