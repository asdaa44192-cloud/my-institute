"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/** action redirects on success (next/navigation's redirect()) — handleConfirm
 * below lets that special throw pass through unstable_rethrow rather than
 * treat it as a failure. */
export function DeactivateButton({ action }: { action: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        unstable_rethrow(e);
        setError(e instanceof Error ? e.message : "فشل إلغاء تفعيل الطالب");
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <Button variant="danger" disabled={pending}>
            {pending ? "جارٍ إلغاء التفعيل..." : "إلغاء تفعيل الطالب"}
          </Button>
        }
        title="إلغاء تفعيل الطالب"
        description="هل تريد إلغاء تفعيل هذا الطالب؟ سيتم إخفاؤه من القوائم النشطة."
        confirmLabel="إلغاء التفعيل"
        onConfirm={handleConfirm}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
