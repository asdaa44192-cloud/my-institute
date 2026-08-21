"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { createStudentWithLogin } from "@/lib/actions/students";
import { studentWelcomeMessage } from "@/lib/whatsapp";
import { generateRandomPassword } from "@/lib/utils";
import { IRAQI_GRADE_LEVELS } from "@/lib/grades";

type CreatedStudent = {
  id: string;
  name: string;
  grade: string;
  parentPhone: string;
  studentPhone?: string | null;
  loginPhone?: string;
  password?: string;
};

export function NewStudentForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [withLogin, setWithLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<CreatedStudent | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const student = await createStudentWithLogin(formData);
        setCreated(student);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل إنشاء الطالب");
      }
    });
  }

  if (created) {
    return (
      <div className="space-y-4 text-right">
        <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          تم إنشاء الطالب <span className="font-semibold">{created.name}</span> بنجاح
          {created.loginPhone ? " مع حساب دخول." : "."}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <WhatsAppButton
            phone={created.parentPhone}
            label="إرسال رسالة ترحيب عبر واتساب"
            message={studentWelcomeMessage({
              studentName: created.name,
              grade: created.grade,
              parentPhone: created.parentPhone,
              studentPhone: created.studentPhone,
              loginPhone: created.loginPhone,
              password: created.password,
            })}
          />
          <Link href={`/students/${created.id}`}>
            <Button variant="secondary">الذهاب إلى ملف الطالب</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} dir="rtl" action={handleSubmit} className="space-y-4 text-right">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">الاسم الكامل</label>
          <input
            name="name"
            required
            className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">الصف / المرحلة</label>
          <select
            name="grade"
            required
            defaultValue=""
            className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
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
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">هاتف الطالب</label>
          <input
            name="studentPhone"
            placeholder="اختياري"
            className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">هاتف ولي الأمر</label>
          <input
            name="parentPhone"
            required
            placeholder="+1555..."
            className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">إجمالي الرسوم الدراسية ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="totalFee"
            required
            className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="rounded-md border border-border p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={withLogin}
            onChange={(e) => setWithLogin(e.target.checked)}
            className="size-4 rounded border-input"
          />
          إنشاء حساب دخول للطالب أيضاً
        </label>

        {withLogin && (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">رقم الهاتف لتسجيل الدخول</label>
              <input
                name="loginPhone"
                required={withLogin}
                placeholder="+1555..."
                className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">كلمة المرور</label>
              <div className="flex gap-2">
                <input
                  name="password"
                  required={withLogin}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
                <Button type="button" variant="secondary" onClick={() => setPassword(generateRandomPassword())}>
                  توليد كلمة مرور عشوائية
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الحفظ..." : "إنشاء الطالب"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
