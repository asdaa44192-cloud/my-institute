"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      // NextAuth sets result.error to the literal string "CredentialsSignin"
      // when authorize() returns null (wrong credentials) — anything else is
      // a message our own authorize() deliberately threw (e.g. rate limiting),
      // and is safe to show as-is.
      setError(
        result.error === "CredentialsSignin"
          ? "البريد الإلكتروني أو رقم الهاتف أو كلمة المرور غير صحيحة."
          : result.error
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div dir="rtl" className="flex min-h-screen flex-1 items-center justify-center bg-muted/50 px-4 text-right">
      <div className="w-full max-w-sm rounded-xl border border-border bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-og.png"
            alt="شعار معهد القمة التعليمي"
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-border"
          />
          <div>
            <h1 className="text-xl font-semibold text-foreground">معهد القمة التعليمي</h1>
            <p className="text-sm text-muted-foreground">سجّل الدخول إلى حسابك</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">البريد الإلكتروني أو رقم الهاتف</label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              placeholder="you@institute.test / +1555..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">كلمة المرور</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        {process.env.NODE_ENV !== "production" && (
          <div className="mt-6 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-muted-foreground">حسابات تجريبية (من بيانات البذر)</p>
            <p>معلم: staff@institute.test / staff123</p>
            <p>طالب: amina@institute.test / student123</p>
          </div>
        )}
      </div>
    </div>
  );
}
