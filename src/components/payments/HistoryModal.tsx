"use client";

import { motion } from "framer-motion";
import { MotionModal } from "@/components/ui/motion-modal";
import type { FinanceStudent } from "@/lib/actions/payments";
import { formatCurrency, formatDate } from "@/lib/utils";

export function HistoryModal({
  student,
  onClose,
}: {
  student: FinanceStudent | null;
  onClose: () => void;
}) {
  return (
    <MotionModal
      open={student !== null}
      onClose={onClose}
      title="سجل الدفعات"
      subtitle={student ? `${student.name} · ${student.grade}` : undefined}
      maxWidth="max-w-lg"
    >
      {student && (
        <div className="space-y-3">
          {student.payments.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">لا توجد دفعات مسجلة بعد.</p>
          ) : (
            <ul className="divide-y divide-border">
              {student.payments.map((p, i) => (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: i * 0.03 }}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {student.payments.length - i}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{formatCurrency(p.amount)}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.note || "بدون ملاحظات"}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">{formatDate(p.date)}</p>
                </motion.li>
              ))}
            </ul>
          )}

          <div className="flex justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">إجمالي المدفوع</span>
            <span className="font-semibold text-foreground">{formatCurrency(student.paid)}</span>
          </div>
        </div>
      )}
    </MotionModal>
  );
}
