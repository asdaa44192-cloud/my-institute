"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createUser } from "@/lib/actions/users";

export function CreateUserForm({
  studentsWithoutLogin,
}: {
  studentsWithoutLogin: { id: string; name: string; grade: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState("TEACHER");
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createUser(formData);
        formRef.current?.reset();
        setRole("TEACHER");
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل إنشاء المستخدم");
      }
    });
  }

  return (
    <form ref={formRef} dir="rtl" action={handleSubmit} className="flex flex-wrap items-end gap-3 text-right">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">الاسم</label>
        <input
          name="name"
          required
          className="w-full sm:w-40 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">البريد الإلكتروني</label>
        <input
          type="email"
          name="email"
          required
          className="w-full sm:w-56 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">الدور</label>
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        >
          <option value="TEACHER">معلم</option>
          <option value="STUDENT">طالب</option>
          <option value="ADMIN">مسؤول</option>
        </select>
      </div>
      {role !== "STUDENT" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">رقم الهاتف</label>
          <input
            name="phone"
            required
            placeholder="+1555..."
            className="w-full sm:w-40 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
      )}
      {role === "STUDENT" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">الطالب</label>
          <select
            name="studentId"
            required
            defaultValue=""
            className="w-full sm:w-48 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          >
            <option value="" disabled>
              اختر الطالب
            </option>
            {studentsWithoutLogin.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.grade})
              </option>
            ))}
          </select>
        </div>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الإنشاء..." : "إنشاء مستخدم"}
      </Button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
