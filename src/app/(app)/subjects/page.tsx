import Link from "next/link";
import { listSubjects } from "@/lib/actions/subjects";
import { requireAdmin } from "@/lib/session";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SubjectForm } from "@/components/subjects/SubjectForm";
import { DeleteSubjectButton } from "@/components/subjects/DeleteSubjectButton";

export default async function SubjectsPage() {
  await requireAdmin();
  const subjects = await listSubjects();

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div>
        <h1 className="text-xl font-semibold text-foreground">المواد الدراسية</h1>
        <p className="text-sm text-muted-foreground">إنشاء المواد وإسناد المعلمين وتسجيل الطلاب في كل مادة.</p>
      </div>

      <Card>
        <CardHeader title="إضافة مادة" />
        <CardBody>
          <SubjectForm />
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="جميع المواد" />
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="h-auto py-3 ps-4">المادة</TableHead>
              <TableHead className="h-auto py-3">المعلمون</TableHead>
              <TableHead className="h-auto py-3">الطلاب المسجلون</TableHead>
              <TableHead className="h-auto py-3 pe-4 text-end">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="ps-4">
                  <Link href={`/subjects/${s.id}`} className="font-medium text-foreground hover:text-primary">
                    {s.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{s._count.teachers}</TableCell>
                <TableCell className="text-muted-foreground">{s._count.enrollments}</TableCell>
                <TableCell className="pe-4 text-end">
                  <DeleteSubjectButton id={s.id} />
                </TableCell>
              </TableRow>
            ))}
            {subjects.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  لا توجد مواد دراسية بعد.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
