"use client";

import { useState, useTransition } from "react";
import { MotionModal } from "@/components/ui/motion-modal";
import { Button } from "@/components/ui/button";
import { saveStudentPayment, type FinanceStudent } from "@/lib/actions/payments";
import { formatDateInput } from "@/lib/utils";

export function PaymentModal({
  student,
  onClose,
}: {
  student: FinanceStudent | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await saveStudentPayment(formData);
        handleClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "تعذر حفظ البيانات");
      }
    });
  }

  return (
    <MotionModal
      open={student !== null}
      onClose={handleClose}
      title="إضافة دفعة / تعديل الرسوم"
      subtitle={student ? `${student.name} · ${student.grade}` : undefined}
    >
      {student && (
        <form action={handleSubmit} className="space-y-5 text-right">
          <input type="hidden" name="studentId" value={student.id} />

          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground">تعديل الرسوم الإجمالية</p>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                إجمالي الرسوم ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="totalFee"
                required
                defaultValue={student.totalFee}
                className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                يمكن تعديلها لتطبيق خصم أو سعر خاص. المدفوع حالياً: {student.paid.toLocaleString()}$
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground">تسجيل دفعة جديدة (اختياري)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">مبلغ الدفعة الجديد ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="amount"
                  placeholder="0.00"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">تاريخ الدفعة</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={formatDateInput(new Date())}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">ملاحظات</label>
              <input
                name="note"
                placeholder="مثال: قسط شهر أيلول"
                className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={pending}>
              إلغاء
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </div>
        </form>
      )}
    </MotionModal>
  );
}
