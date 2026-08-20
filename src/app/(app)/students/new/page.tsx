import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { NewStudentForm } from "@/components/students/NewStudentForm";
import { requireAdmin } from "@/lib/session";

export default async function NewStudentPage() {
  await requireAdmin();

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div>
        <h1 className="text-xl font-semibold text-foreground">إضافة طالب</h1>
        <p className="text-sm text-muted-foreground">إنشاء ملف طالب جديد وسجل الرسوم الدراسية.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader title="بيانات الطالب" />
        <CardBody>
          <NewStudentForm />
        </CardBody>
      </Card>
    </div>
  );
}
