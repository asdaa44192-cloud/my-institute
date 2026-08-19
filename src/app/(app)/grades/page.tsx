import { getStudents } from "@/lib/actions/students";
import { addGrade, getGradesBySubject, getGradeStatsBySubject } from "@/lib/actions/grades";
import { getSubjectsForCurrentUser } from "@/lib/actions/subjects";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { GradeForm } from "@/components/grades/GradeForm";
import { GradeChart } from "@/components/grades/GradeChart";
import { formatDate } from "@/lib/utils";

export default async function GradesPage() {
  const [students, grades, stats, subjects] = await Promise.all([
    getStudents(),
    getGradesBySubject(),
    getGradeStatsBySubject(),
    getSubjectsForCurrentUser(),
  ]);

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div>
        <h1 className="text-xl font-semibold text-foreground">الدرجات</h1>
        <p className="text-sm text-muted-foreground">تسجيل درجات الاختبارات ومراجعة الأداء حسب المادة.</p>
      </div>

      <Card>
        <CardHeader title="متوسط الدرجات حسب المادة" />
        <CardBody>
          <GradeChart data={stats} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="تسجيل درجة" />
        <CardBody>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">أضف طلاباً أولاً لتسجيل الدرجات.</p>
          ) : (
            <GradeForm students={students} subjects={subjects} action={addGrade} />
          )}
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="جميع سجلات الدرجات" />
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="h-auto py-3 ps-4">التاريخ</TableHead>
              <TableHead className="h-auto py-3">الطالب</TableHead>
              <TableHead className="h-auto py-3">المادة</TableHead>
              <TableHead className="h-auto py-3">الاختبار</TableHead>
              <TableHead className="h-auto py-3 pe-4 text-end">الدرجة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.map((g) => {
              const pct = (g.score / g.maxScore) * 100;
              return (
                <TableRow key={g.id}>
                  <TableCell className="ps-4 text-muted-foreground">{formatDate(g.date)}</TableCell>
                  <TableCell className="font-medium text-foreground">{g.student.name}</TableCell>
                  <TableCell className="text-muted-foreground">{g.subject.name}</TableCell>
                  <TableCell className="text-muted-foreground">{g.examName}</TableCell>
                  <TableCell className="pe-4 text-end">
                    <Badge color={pct >= 70 ? "green" : pct >= 50 ? "amber" : "red"}>
                      {g.score}/{g.maxScore}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {grades.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  لا توجد درجات مسجلة بعد.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
