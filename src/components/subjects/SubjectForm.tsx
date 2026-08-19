"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createSubject } from "@/lib/actions/subjects";

export function SubjectForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createSubject(formData);
        formRef.current?.reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل إنشاء المادة");
      }
    });
  }

  return (
    <form ref={formRef} dir="rtl" action={handleSubmit} className="flex flex-wrap items-end gap-3 text-right">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">اسم المادة</label>
        <input
          name="name"
          required
          placeholder="الرياضيات"
          className="w-full sm:w-56 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الإنشاء..." : "إضافة مادة"}
      </Button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
