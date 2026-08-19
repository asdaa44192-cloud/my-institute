"use client";

import { useState, useTransition } from "react";
import { deleteSubject } from "@/lib/actions/subjects";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteSubjectButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteSubject(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل حذف المادة");
      }
    });
  }

  return (
    <div className="text-left">
      <ConfirmDialog
        trigger={
          <button disabled={pending} className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
            {pending ? "..." : "حذف"}
          </button>
        }
        title="حذف المادة"
        description="هل تريد حذف هذه المادة؟ لا يمكن حذف مادة لها سجلات درجات أو حضور سابقة."
        confirmLabel="حذف"
        onConfirm={handleConfirm}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
