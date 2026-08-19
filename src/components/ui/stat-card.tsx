import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  tone = "slate",
  icon,
  index = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "slate" | "indigo" | "red" | "emerald" | "amber";
  icon?: ReactNode;
  index?: number;
}) {
  const toneStyles: Record<string, string> = {
    slate: "bg-muted text-muted-foreground",
    indigo: "bg-primary/10 text-primary",
    red: "bg-red-50 text-red-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div
      className="animate-stagger-in rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", toneStyles[tone])}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
