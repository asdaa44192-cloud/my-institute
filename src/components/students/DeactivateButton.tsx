"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeactivateButton({ action }: { action: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="danger" disabled={pending}>
          {pending ? "جارٍ إلغاء التفعيل..." : "إلغاء تفعيل الطالب"}
        </Button>
      }
      title="إلغاء تفعيل الطالب"
      description="هل تريد إلغاء تفعيل هذا الطالب؟ سيتم إخفاؤه من القوائم النشطة."
      confirmLabel="إلغاء التفعيل"
      onConfirm={() => startTransition(() => action())}
    />
  );
}
