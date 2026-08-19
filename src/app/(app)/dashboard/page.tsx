import Link from "next/link";
import Image from "next/image";
import { getDashboardData } from "@/lib/actions/dashboard";
import { getMyStudentProfile } from "@/lib/actions/students";
import { requireUser } from "@/lib/session";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { EnrollmentChart } from "@/components/dashboard/EnrollmentChart";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { Badge } from "@/components/ui/badge";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { formatCurrency } from "@/lib/utils";
import { paymentReminderMessage } from "@/lib/whatsapp";

export default async function DashboardPage() {
  const currentUser = await requireUser();
  if (currentUser.role === "STUDENT") {
    const student = await getMyStudentProfile();
    return student ? <StudentDashboard student={student} /> : null;
  }

  const data = await getDashboardData();
  const isAdmin = data.role === "ADMIN";

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div className="flex items-center gap-4">
        <Image
          src="/logo.jpg"
          alt="شعار معهد القمة التعليمي"
          width={64}
          height={64}
          className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-border"
        />
        <div>
          <h1 className="text-xl font-semibold text-foreground">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground">نظرة عامة على أهم مؤشرات المعهد.</p>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            index={0}
            label="إجمالي الطلاب"
            value={String(data.totalStudents)}
            tone="indigo"
            icon="🎓"
            hint="الطلاب المسجلون حالياً"
          />
          <StatCard
            index={1}
            label="الأرصدة غير المدفوعة"
            value={formatCurrency(data.unpaidBalance)}
            tone="red"
            icon="⚠️"
            hint="المستحقات على جميع الطلاب"
          />
          <StatCard
            index={2}
            label="الدخل هذا الشهر"
            value={formatCurrency(data.monthlyIncome)}
            tone="emerald"
            icon="💰"
            hint="الدفعات المستلمة"
          />
          <StatCard
            index={3}
            label="الحسابات المتأخرة"
            value={String(data.overdue.length)}
            tone="amber"
            icon="⏰"
            hint="متأخرة أكثر من 30 يومًا"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="التسجيل حسب الصف" subtitle="عدد الطلاب النشطين في كل مرحلة دراسية" />
          <CardBody>
            <EnrollmentChart data={data.enrollmentChartData} />
          </CardBody>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader title="تنبيهات الدفع المتأخر" subtitle="لا نشاط دفع منذ أكثر من 30 يومًا" />
            <CardBody className="max-h-[320px] overflow-y-auto">
              {data.overdue.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">لا توجد حسابات متأخرة. 🎉</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.overdue.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link href={`/students/${s.id}`} className="truncate text-sm font-medium text-foreground hover:text-primary">
                          {s.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {s.grade} &middot; {s.daysSince} يومًا منذ آخر دفعة
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge color="red">{formatCurrency(s.remaining)}</Badge>
                        <WhatsAppButton
                          phone={s.parentPhone}
                          message={paymentReminderMessage({
                            studentName: s.name,
                            grade: s.grade,
                            remaining: s.remaining,
                          })}
                          compact
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
