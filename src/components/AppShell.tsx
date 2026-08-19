import type { ReactNode } from "react";
import Image from "next/image";
import { NavLinks, type NavItem } from "@/components/NavLinks";
import { MobileNav } from "@/components/MobileNav";
import { SignOutButton } from "@/components/SignOutButton";
import { ROLE_LABELS } from "@/lib/labels";

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: "📊" },
  { href: "/students", label: "الطلاب", icon: "🎓" },
  { href: "/payments", label: "الدفعات", icon: "💳" },
  { href: "/attendance", label: "الحضور", icon: "📋" },
  { href: "/grades", label: "الدرجات", icon: "📝" },
  { href: "/subjects", label: "المواد الدراسية", icon: "📚" },
  { href: "/settings", label: "الإعدادات", icon: "⚙️" },
];

const TEACHER_NAV: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: "📊" },
  { href: "/students", label: "الطلاب", icon: "🎓" },
  { href: "/attendance", label: "الحضور", icon: "📋" },
  { href: "/grades", label: "الدرجات", icon: "📝" },
];

const STUDENT_NAV: NavItem[] = [{ href: "/dashboard", label: "لوحة التحكم", icon: "📊" }];

export function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  user: { name?: string | null; email?: string | null; role: "ADMIN" | "TEACHER" | "STUDENT" };
}) {
  const items =
    user.role === "ADMIN" ? ADMIN_NAV : user.role === "TEACHER" ? TEACHER_NAV : STUDENT_NAV;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MobileNav items={items} user={user} />

      <aside className="no-print hidden w-64 shrink-0 flex-col border-e border-border bg-card py-5 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-5">
          <Image
            src="/logo.jpg"
            alt="شعار معهد القمة التعليمي"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
          />
          <div>
            <p className="text-base font-semibold text-foreground">معهد القمة التعليمي</p>
            <p className="text-xs text-muted-foreground">نظام إدارة المعهد</p>
          </div>
        </div>
        <NavLinks items={items} />
        <div className="mt-auto border-t border-border px-5 pt-4">
          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-primary">
            {ROLE_LABELS[user.role]}
          </p>
          <div className="mt-2">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
