"use client";

import { useState, useTransition } from "react";
import { resetStudentLoginCredentials } from "@/lib/actions/students";
import { studentCredentialsMessage, whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export function StudentCredentialsWhatsAppButton({
  studentId,
  compact = false,
}: {
  studentId: string;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);

    // Open the tab synchronously (inside the click handler) so the browser
    // doesn't treat it as an unrequested popup once the async call below
    // resolves. Sever window.opener so the WhatsApp page it eventually
    // loads can't reach back into this tab.
    const win = window.open("", "_blank");
    if (win) win.opener = null;

    startTransition(async () => {
      try {
        const student = await resetStudentLoginCredentials(studentId);
        const message = studentCredentialsMessage({
          studentName: student.name,
          grade: student.grade,
          parentPhone: student.parentPhone,
          password: student.password,
        });
        const link = whatsappLink(student.parentPhone, message);
        if (win) {
          win.location.href = link;
        } else {
          window.open(link, "_blank", "noopener,noreferrer");
        }
      } catch (e) {
        win?.close();
        setError(e instanceof Error ? e.message : "فشل إرسال بيانات الدخول");
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md bg-emerald-600 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60",
          compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm"
        )}
      >
        <span aria-hidden>💬</span>
        {pending ? "جارٍ الإرسال..." : "واتساب"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
