import Link from "next/link";
import { getAllPayments } from "@/lib/actions/payments";
import { requireAdmin } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { paymentMethodLabel } from "@/lib/labels";

export default async function PaymentsPage() {
  await requireAdmin();
  const payments = await getAllPayments();

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div>
        <h1 className="text-xl font-semibold text-foreground">الدفعات</h1>
        <p className="text-sm text-muted-foreground">
          {payments.length} دفعة حديثة &middot; إجمالي المعروض {formatCurrency(total)}
        </p>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="h-auto py-3 ps-4">التاريخ</TableHead>
              <TableHead className="h-auto py-3">الطالب</TableHead>
              <TableHead className="h-auto py-3">الصف</TableHead>
              <TableHead className="h-auto py-3">طريقة الدفع</TableHead>
              <TableHead className="h-auto py-3 text-end">المبلغ</TableHead>
              <TableHead className="h-auto py-3 pe-4 text-end">الإيصال</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="ps-4 text-muted-foreground">{formatDate(p.date)}</TableCell>
                <TableCell>
                  <Link href={`/students/${p.studentId}`} className="font-medium text-foreground hover:text-primary">
                    {p.student.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.student.grade}</TableCell>
                <TableCell className="text-muted-foreground">{paymentMethodLabel(p.method)}</TableCell>
                <TableCell className="text-end font-medium text-foreground">{formatCurrency(p.amount)}</TableCell>
                <TableCell className="pe-4 text-end">
                  <Link
                    href={`/students/${p.studentId}/receipt/${p.id}`}
                    className="text-xs font-medium text-primary hover:text-primary/80"
                  >
                    عرض
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  لا توجد دفعات مسجلة بعد.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
