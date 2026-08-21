"use client";

import { useState, useTransition } from "react";
import { deletePayment } from "@/lib/actions/payments";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeletePaymentButton({ id, studentId }: { id: string; studentId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await deletePayment(id, studentId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل حذف الدفعة");
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <ConfirmDialog
        trigger={
          <button disabled={pending} className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
            {pending ? "..." : "حذف"}
          </button>
        }
        title="حذف الدفعة"
        description="هل تريد حذف سجل الدفعة هذا؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        onConfirm={handleConfirm}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
