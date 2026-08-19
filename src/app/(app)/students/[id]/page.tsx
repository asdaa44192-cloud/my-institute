import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentById } from "@/lib/actions/students";
import { addPayment } from "@/lib/actions/payments";
import { getCurrentUser } from "@/lib/session";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { DeletePaymentButton } from "@/components/payments/DeletePaymentButton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { paymentReminderMessage, receiptMessage } from "@/lib/whatsapp";
import { paymentMethodLabel, ATTENDANCE_STATUS_LABELS } from "@/lib/labels";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [student, user] = await Promise.all([getStudentById(id), getCurrentUser()]);
  if (!student) notFound();

  const isAdmin = user?.role === "ADMIN";

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{student.name}</h1>
            <Badge color="indigo">{student.grade}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            تاريخ التسجيل {formatDate(student.enrollDate)} &middot; ولي الأمر: {student.parentPhone}
          </p>
        </div>
        <div className="flex gap-2">
          <WhatsAppButton
            phone={student.parentPhone}
            label="مراسلة ولي الأمر"
            message={`مرحباً، بخصوص الطالب ${student.name} (${student.grade}).`}
          />
          {isAdmin && (
            <Link href={`/students/${student.id}/edit`}>
              <Button variant="secondary">تعديل</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="معلومات التواصل" />
          <CardBody className="space-y-3 text-sm">
            <InfoRow label="هاتف الطالب" value={student.studentPhone || "—"} />
            <InfoRow label="هاتف ولي الأمر" value={student.parentPhone} />
            <InfoRow label="الصف / المرحلة" value={student.grade} />
            <InfoRow label="الحالة" value={student.active ? "نشط" : "غير نشط"} />
            <div className="flex justify-between">
              <span className="text-muted-foreground">المواد الدراسية</span>
              <span className="flex flex-wrap justify-end gap-1">
                {student.subjects.length === 0 ? (
                  <span className="font-medium text-foreground">—</span>
                ) : (
                  student.subjects.map((ss) => <Badge key={ss.id}>{ss.subject.name}</Badge>)
                )}
              </span>
            </div>
          </CardBody>
        </Card>

        {isAdmin ? (
          <Card className="lg:col-span-2">
            <CardHeader title="ملخص الرسوم" subtitle="نظرة عامة على الرسوم والرصيد" />
            <CardBody>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي الرسوم</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(student.totalFee)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المدفوع</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-600">{formatCurrency(student.paid)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المتبقي</p>
                  <p className={`mt-1 text-lg font-semibold ${student.remaining > 0 ? "text-red-600" : "text-foreground"}`}>
                    {formatCurrency(student.remaining)}
                  </p>
                </div>
              </div>
              {student.remaining > 0 && (
                <div className="mt-4 flex justify-center">
                  <WhatsAppButton
                    phone={student.parentPhone}
                    label="إرسال تذكير بالدفع"
                    message={paymentReminderMessage({
                      studentName: student.name,
                      grade: student.grade,
                      remaining: student.remaining,
                    })}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader title="ملخص الرسوم" />
            <CardBody>
              <p className="text-sm text-muted-foreground">التفاصيل المالية مقتصرة على المسؤولين.</p>
            </CardBody>
          </Card>
        )}
      </div>

      {isAdmin && (
        <Card>
          <CardHeader title="سجل الدفعات" subtitle="تسجيل دفعة جديدة أو مراجعة الدفعات السابقة" />
          <CardBody className="space-y-5">
            <PaymentForm studentId={student.id} action={addPayment} />

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-right text-muted-foreground">
                    <th className="py-2 pl-4 font-medium">التاريخ</th>
                    <th className="py-2 pl-4 font-medium">المبلغ</th>
                    <th className="py-2 pl-4 font-medium">طريقة الدفع</th>
                    <th className="py-2 pl-4 font-medium">ملاحظة</th>
                    <th className="py-2 pl-4 font-medium text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {student.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 pl-4 text-muted-foreground">{formatDate(p.date)}</td>
                      <td className="py-2 pl-4 font-medium text-foreground">{formatCurrency(p.amount)}</td>
                      <td className="py-2 pl-4 text-muted-foreground">{paymentMethodLabel(p.method)}</td>
                      <td className="py-2 pl-4 text-muted-foreground">{p.note || "—"}</td>
                      <td className="py-2 pl-4">
                        <div className="flex items-center justify-start gap-3">
                          <Link
                            href={`/students/${student.id}/receipt/${p.id}`}
                            className="text-xs font-medium text-primary hover:text-primary"
                          >
                            الإيصال
                          </Link>
                          <WhatsAppButton
                            compact
                            phone={student.parentPhone}
                            label="إرسال"
                            message={receiptMessage({
                              studentName: student.name,
                              amount: p.amount,
                              date: formatDate(p.date),
                              remaining: student.remaining,
                            })}
                          />
                          <DeletePaymentButton id={p.id} studentId={student.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {student.payments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        لا توجد دفعات مسجلة بعد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="الحضور الأخير" subtitle="آخر 30 سجلاً" />
          <CardBody className="max-h-72 overflow-y-auto">
            {student.attendanceRecords.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا يوجد حضور مسجل بعد.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {student.attendanceRecords.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">
                      {formatDate(a.date)} &middot; {a.subject.name}
                    </span>
                    <Badge color={a.status === "PRESENT" ? "green" : a.status === "LATE" ? "amber" : "red"}>
                      {ATTENDANCE_STATUS_LABELS[a.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="الدرجات" subtitle="درجات الاختبارات والتقييمات" />
          <CardBody className="max-h-72 overflow-y-auto">
            {student.gradeRecords.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد درجات مسجلة بعد.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {student.gradeRecords.map((g) => {
                  const pct = (g.score / g.maxScore) * 100;
                  return (
                    <li key={g.id} className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">
                        {g.subject.name} &middot; {g.examName}
                      </span>
                      <Badge color={pct >= 70 ? "green" : pct >= 50 ? "amber" : "red"}>
                        {g.score}/{g.maxScore}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
