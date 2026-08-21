"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createUser } from "@/lib/actions/users";
import { generateRandomPassword } from "@/lib/utils";
import { IRAQI_GRADE_LEVELS } from "@/lib/grades";

export function CreateUserForm({ subjects }: { subjects: { id: string; name: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState("TEACHER");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  const showSubjects = role === "STUDENT" || role === "TEACHER";
  const isStudent = role === "STUDENT";

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createUser(formData);
        formRef.current?.reset();
        setRole("TEACHER");
        setPassword("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل إنشاء المستخدم");
      }
    });
  }

  return (
    <form ref={formRef} dir="rtl" action={handleSubmit} className="flex flex-wrap items-end gap-3 text-right">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">الاسم الكامل</label>
        <input
          name="name"
          required
          className="w-full sm:w-40 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          البريد الإلكتروني أو رقم الهاتف
        </label>
        <input
          name="identifier"
          required
          placeholder="example@mail.com أو +1555..."
          className="w-full sm:w-56 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">كلمة المرور</label>
        <div className="flex gap-2">
          <input
            name="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full sm:w-40 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <Button type="button" variant="secondary" onClick={() => setPassword(generateRandomPassword())}>
            توليد كلمة مرور عشوائية
          </Button>
        </div>
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

      {isStudent && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">الصف الدراسي</label>
          <select
            name="grade"
            required={isStudent}
            defaultValue=""
            className="w-full sm:w-48 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          >
            <option value="" disabled>
              اختر الصف
            </option>
            {IRAQI_GRADE_LEVELS.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>
      )}

      {showSubjects && (
        <div className="w-full rounded-md border border-border p-3">
          <p className="mb-2 text-sm font-medium text-foreground">المواد الدراسية</p>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مواد دراسية بعد. أضف مواداً من صفحة المواد الدراسية.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="subjectIds" value={s.id} className="size-4 rounded border-input" />
                  {s.name}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الإنشاء..." : "إنشاء مستخدم"}
      </Button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
