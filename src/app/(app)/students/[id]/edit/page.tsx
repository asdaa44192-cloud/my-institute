import { notFound } from "next/navigation";
import { getStudentById } from "@/lib/actions/students";
import { updateStudent, deactivateStudent } from "@/lib/actions/students";
import { requireAdmin } from "@/lib/session";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StudentForm } from "@/components/students/StudentForm";
import { DeactivateButton } from "@/components/students/DeactivateButton";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const student = await getStudentById(id);
  if (!student) notFound();

  const updateWithId = updateStudent.bind(null, id);
  const deactivateWithId = deactivateStudent.bind(null, id);

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div>
        <h1 className="text-xl font-semibold text-foreground">تعديل بيانات الطالب</h1>
        <p className="text-sm text-muted-foreground">{student.name}</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader title="بيانات الطالب" />
        <CardBody>
          <StudentForm
            action={updateWithId}
            submitLabel="حفظ التغييرات"
            defaults={{
              name: student.name,
              grade: student.grade,
              studentPhone: student.studentPhone,
              parentPhone: student.parentPhone,
              totalFee: student.totalFee,
            }}
          />
        </CardBody>
      </Card>

      <Card className="max-w-2xl border-red-200">
        <CardHeader title="منطقة الخطر" subtitle="إلغاء التفعيل يزيل الطالب من القوائم النشطة" />
        <CardBody>
          <DeactivateButton action={deactivateWithId} />
        </CardBody>
      </Card>
    </div>
  );
}
