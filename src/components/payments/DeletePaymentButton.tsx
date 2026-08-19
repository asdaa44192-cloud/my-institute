"use client";

import { useTransition } from "react";
import { deletePayment } from "@/lib/actions/payments";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeletePaymentButton({ id, studentId }: { id: string; studentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <button disabled={pending} className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
          {pending ? "..." : "حذف"}
        </button>
      }
      title="حذف الدفعة"
      description="هل تريد حذف سجل الدفعة هذا؟ لا يمكن التراجع عن هذا الإجراء."
      confirmLabel="حذف"
      onConfirm={() => startTransition(() => deletePayment(id, studentId))}
    />
  );
}
