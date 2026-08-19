"use client";

import { useState, useTransition } from "react";
import { createInvitation } from "@/lib/actions/invitations";

export function InviteButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  function handleClick() {
    setStatus(null);
    startTransition(async () => {
      try {
        const { url, sent } = await createInvitation(userId);
        setStatus(
          sent
            ? { ok: true, message: "تم إرسال الدعوة عبر واتساب" }
            : { ok: false, message: `تعذر الإرسال تلقائياً — الرابط: ${url}` }
        );
      } catch (e) {
        setStatus({ ok: false, message: e instanceof Error ? e.message : "فشل إرسال الدعوة" });
      }
    });
  }

  return (
    <div className="text-left">
      <button
        disabled={pending}
        onClick={handleClick}
        className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50"
      >
        {pending ? "..." : isActive ? "إعادة تعيين كلمة المرور" : "إرسال الدعوة"}
      </button>
      {status && (
        <p className={`mt-1 max-w-[220px] break-words text-xs ${status.ok ? "text-emerald-600" : "text-amber-600"}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
