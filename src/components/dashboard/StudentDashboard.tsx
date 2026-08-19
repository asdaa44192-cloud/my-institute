import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/labels";
import type { getMyStudentProfile } from "@/lib/actions/students";

type StudentProfile = NonNullable<Awaited<ReturnType<typeof getMyStudentProfile>>>;

export function StudentDashboard({ student }: { student: StudentProfile }) {
  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground">{student.name}</h1>
          <Badge color="indigo">{student.grade}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">لوحة التحكم الخاصة بك</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="المواد الدراسية" />
          <CardBody>
            {student.subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">لم يتم تسجيلك في أي مادة بعد.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {student.subjects.map((ss) => (
                  <Badge key={ss.id} color="indigo">
                    {ss.subject.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

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
          </CardBody>
        </Card>
      </div>

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
