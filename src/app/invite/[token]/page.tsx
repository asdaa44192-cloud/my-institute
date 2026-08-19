"use client";

import { use, useState, type FormEvent } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { completeInvitation } from "@/lib/actions/invitations";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);
    try {
      const { email } = await completeInvitation(token, password);
      const result = await signIn("credentials", { identifier: email, password, redirect: false });
      if (result?.error) {
        setError("تم تعيين كلمة المرور، لكن تعذّر تسجيل الدخول تلقائياً. يرجى تسجيل الدخول يدوياً.");
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="flex min-h-screen flex-1 items-center justify-center bg-muted/50 px-4 text-right">
      <div className="w-full max-w-sm rounded-xl border border-border bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="شعار معهد القمة التعليمي"
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-border"
          />
          <div>
            <h1 className="text-xl font-semibold text-foreground">معهد القمة التعليمي</h1>
            <p className="text-sm text-muted-foreground">تعيين كلمة المرور</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">كلمة المرور الجديدة</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">تأكيد كلمة المرور</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "جارٍ الحفظ..." : "تعيين كلمة المرور وتسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
