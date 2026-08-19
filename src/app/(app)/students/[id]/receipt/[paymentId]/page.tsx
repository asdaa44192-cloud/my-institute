import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { ReceiptActions } from "@/components/payments/ReceiptActions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { paymentMethodLabel } from "@/lib/labels";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string; paymentId: string }>;
}) {
  await requireAdmin();
  const { id, paymentId } = await params;

  const [student, payment, allPayments] = await Promise.all([
    prisma.student.findUnique({ where: { id } }),
    prisma.payment.findUnique({ where: { id: paymentId } }),
    prisma.payment.findMany({ where: { studentId: id } }),
  ]);

  if (!student || !payment || payment.studentId !== id) notFound();

  const paid = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = student.totalFee - paid;

  return (
    <div dir="rtl" className="mx-auto max-w-xl text-right">
      <div className="mb-4 flex justify-start">
        <ReceiptActions
          data={{
            receiptNo: payment.id.slice(-8).toUpperCase(),
            studentName: student.name,
            grade: student.grade,
            amount: payment.amount,
            date: payment.date.toISOString(),
            method: payment.method,
            totalFee: student.totalFee,
            paid,
            remaining,
          }}
        />
      </div>

      <div className="rounded-xl border border-border bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <div className="border-b border-border pb-4">
          <h1 className="text-lg font-semibold text-foreground">معهد القمة التعليمي</h1>
          <p className="text-sm text-muted-foreground">إيصال دفع رسمي</p>
        </div>

        <div className="mt-4 flex justify-between text-sm text-muted-foreground">
          <span>رقم الإيصال: {payment.id.slice(-8).toUpperCase()}</span>
          <span>التاريخ: {formatDate(payment.date)}</span>
        </div>

        <dl className="mt-6 divide-y divide-border text-sm">
          <Row label="اسم الطالب" value={student.name} />
          <Row label="الصف / المرحلة" value={student.grade} />
          <Row label="طريقة الدفع" value={paymentMethodLabel(payment.method)} />
          {payment.note && <Row label="ملاحظة" value={payment.note} />}
          <Row label="المبلغ المدفوع" value={formatCurrency(payment.amount)} emphasize />
        </dl>

        <div className="mt-6 rounded-lg bg-muted/50 p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">إجمالي الرسوم الدراسية</span>
            <span className="font-medium text-foreground">{formatCurrency(student.totalFee)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">إجمالي المدفوع حتى الآن</span>
            <span className="font-medium text-foreground">{formatCurrency(paid)}</span>
          </div>
          <div className="flex justify-between border-t border-border py-1 pt-2">
            <span className="text-muted-foreground">الرصيد المتبقي</span>
            <span className="font-semibold text-foreground">{formatCurrency(remaining)}</span>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">شكراً لدفعتكم.</p>
      </div>
    </div>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex justify-between py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={emphasize ? "font-semibold text-foreground" : "text-foreground"}>{value}</dd>
    </div>
  );
}
