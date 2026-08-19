"use client";

import { useTransition } from "react";
import { deleteUser } from "@/lib/actions/users";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteUserButton({ id, currentUserId }: { id: string; currentUserId: string }) {
  const [pending, startTransition] = useTransition();
  const isSelf = id === currentUserId;

  return (
    <ConfirmDialog
      trigger={
        <button
          disabled={pending || isSelf}
          title={isSelf ? "لا يمكنك حذف حسابك الخاص" : undefined}
          className="text-xs font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          {pending ? "..." : "حذف"}
        </button>
      }
      title="حذف المستخدم"
      description="هل تريد حذف حساب هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء."
      confirmLabel="حذف"
      onConfirm={() => startTransition(() => deleteUser(id, currentUserId))}
    />
  );
}
