"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteStudent } from "@/lib/actions/students";

export function DeleteStudentButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteStudent(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل حذف الطالب");
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <Button variant="danger" size="sm" disabled={pending}>
            {pending ? "جارٍ الحذف..." : "حذف الطالب"}
          </Button>
        }
        title="حذف الطالب"
        description={`هل أنت متأكد من حذف الطالب "${name}" نهائياً؟ سيتم حذف جميع بياناته (الدفعات، الحضور، الدرجات) وحسابه في بوابة الطالب بشكل دائم. لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف نهائياً"
        onConfirm={handleConfirm}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
