import { cn } from "@/lib/utils";

const styles = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  slate: "bg-secondary text-secondary-foreground ring-border",
  indigo: "bg-primary/10 text-primary ring-primary/20",
};

export function Badge({
  children,
  color = "slate",
  pulse = false,
  className,
}: {
  children: React.ReactNode;
  color?: keyof typeof styles;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        styles[color],
        className
      )}
    >
      {pulse && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {children}
    </span>
  );
}
