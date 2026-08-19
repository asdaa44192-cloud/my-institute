"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLinks, type NavItem } from "@/components/NavLinks";
import { SignOutButton } from "@/components/SignOutButton";
import { ROLE_LABELS } from "@/lib/labels";

export function MobileNav({
  items,
  user,
}: {
  items: NavItem[];
  user: { name?: string | null; email?: string | null; role: "ADMIN" | "TEACHER" | "STUDENT" };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="no-print flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.jpg"
            alt="شعار معهد القمة التعليمي"
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-border"
          />
          <p className="text-sm font-semibold text-foreground">معهد القمة التعليمي</p>
        </div>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="فتح القائمة">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
      </div>

      <SheetContent side="right" dir="rtl" className="flex w-72 flex-col p-0 text-right">
        <SheetHeader className="border-b border-border text-right">
          <SheetTitle className="flex items-center gap-2.5 text-right">
            <Image
              src="/logo.jpg"
              alt="شعار معهد القمة التعليمي"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border"
            />
            معهد القمة التعليمي
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <NavLinks items={items} onNavigate={() => setOpen(false)} />
        </div>

        <div className="border-t border-border px-5 py-4">
          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-primary">{ROLE_LABELS[user.role]}</p>
          <div className="mt-2">
            <SignOutButton />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
