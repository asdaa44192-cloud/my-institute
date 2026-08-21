"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { HistoryModal } from "@/components/payments/HistoryModal";
import type { FinanceStudent } from "@/lib/actions/payments";
import { formatCurrency, formatDate, normalizePhoneDigits, cn } from "@/lib/utils";
import { IRAQI_GRADE_LEVELS } from "@/lib/grades";

type StatusFilter = "all" | "pending" | "paid";

function paymentCountLabel(count: number) {
  if (count === 0) return "لا توجد دفعات";
  if (count === 1) return "دفعة واحدة";
  return `${count} دفعات`;
}

function statusBadge(student: FinanceStudent) {
  if (student.remaining <= 0) return { color: "green" as const, label: "مكتمل" };
  if (student.paid > 0) return { color: "amber" as const, label: "جزئي" };
  return { color: "red" as const, label: "غير مدفوع" };
}

export function FinanceDashboard({
  students,
  subjects,
}: {
  students: FinanceStudent[];
  subjects: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [grade, setGrade] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [paymentModalStudent, setPaymentModalStudent] = useState<FinanceStudent | null>(null);
  const [historyModalStudent, setHistoryModalStudent] = useState<FinanceStudent | null>(null);

  const summary = useMemo(() => {
    const totalCollections = students.reduce((sum, s) => sum + s.paid, 0);
    const totalOutstanding = students.reduce((sum, s) => sum + Math.max(s.remaining, 0), 0);
    const pendingCount = students.filter((s) => s.remaining > 0).length;
    return { totalCollections, totalOutstanding, pendingCount };
  }, [students]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const queryDigits = normalizePhoneDigits(search);
    return students.filter((s) => {
      if (status === "pending" && s.remaining <= 0) return false;
      if (status === "paid" && s.remaining > 0) return false;
      if (grade && s.grade !== grade) return false;
      if (subjectId && !s.subjects.some((sub) => sub.id === subjectId)) return false;
      if (query) {
        const nameMatch = s.name.toLowerCase().includes(query);
        const phoneMatch = queryDigits.length > 0 && normalizePhoneDigits(s.parentPhone).includes(queryDigits);
        if (!nameMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [students, search, status, grade, subjectId]);

  const hasActiveFilters = search || status !== "all" || grade || subjectId;

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <h1 className="text-xl font-semibold text-foreground">الإدارة المالية</h1>
        <p className="text-sm text-muted-foreground">متابعة رسوم الطلاب والدفعات والأرصدة المستحقة.</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          index={0}
          label="إجمالي التحصيلات"
          value={formatCurrency(summary.totalCollections)}
          tone="emerald"
          icon="💰"
          hint="مجموع كل الدفعات المستلمة"
        />
        <StatCard
          index={1}
          label="إجمالي الديون المستحقة"
          value={formatCurrency(summary.totalOutstanding)}
          tone="red"
          icon="⚠️"
          hint="الأرصدة المتبقية على جميع الطلاب"
        />
        <StatCard
          index={2}
          label="طلاب لديهم رصيد متبقٍ"
          value={String(summary.pendingCount)}
          tone="amber"
          icon="⏳"
          hint={`من أصل ${students.length} طالب نشط`}
        />
      </div>

      <Card className="space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              بحث سريع بالاسم أو رقم هاتف ولي الأمر
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="مثال: أمينة، 07701234567"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-44">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">الصف</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              >
                <option value="">كل الصفوف</option>
                {IRAQI_GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-44">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">المادة</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              >
                <option value="">كل المواد</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                  setGrade("");
                  setSubjectId("");
                }}
                className="pb-2 text-sm text-muted-foreground hover:text-foreground"
              >
                مسح الكل
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "الكل"],
              ["pending", "رصيد متبقٍ"],
              ["paid", "مدفوع بالكامل"],
            ] as [StatusFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                status === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="h-auto py-3 ps-4">الطالب</TableHead>
              <TableHead className="h-auto py-3 text-end">إجمالي الرسوم</TableHead>
              <TableHead className="h-auto py-3 text-end">المدفوع</TableHead>
              <TableHead className="h-auto py-3 text-end">المتبقي</TableHead>
              <TableHead className="h-auto py-3">عدد الدفعات</TableHead>
              <TableHead className="h-auto py-3">آخر دفعة</TableHead>
              <TableHead className="h-auto py-3">الحالة</TableHead>
              <TableHead className="h-auto py-3 pe-4 text-end">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence initial={false} mode="popLayout">
              {filtered.map((s) => {
                const badge = statusBadge(s);
                return (
                  <motion.tr
                    key={s.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="border-b border-border transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="ps-4">
                      <p className="font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.grade}
                        {s.subjects.length > 0 && ` · ${s.subjects.map((sub) => sub.name).join("، ")}`}
                      </p>
                    </TableCell>
                    <TableCell className="text-end font-medium text-foreground">
                      {formatCurrency(s.totalFee)}
                    </TableCell>
                    <TableCell className="text-end text-emerald-600">{formatCurrency(s.paid)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-end font-medium",
                        s.remaining > 0 ? "text-red-600" : "text-muted-foreground"
                      )}
                    >
                      {formatCurrency(s.remaining)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{paymentCountLabel(s.paymentCount)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.lastPaymentDate ? formatDate(s.lastPaymentDate) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge color={badge.color}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="pe-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setPaymentModalStudent(s)}>
                          دفعة / تعديل
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setHistoryModalStudent(s)}>
                          السجل
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  لا يوجد طلاب مطابقون لهذا البحث.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <PaymentModal student={paymentModalStudent} onClose={() => setPaymentModalStudent(null)} />
      <HistoryModal student={historyModalStudent} onClose={() => setHistoryModalStudent(null)} />
    </div>
  );
}
