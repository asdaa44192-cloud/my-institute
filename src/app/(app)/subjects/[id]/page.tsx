import { notFound } from "next/navigation";
import { getSubjectDetail } from "@/lib/actions/subjects";
import { requireAdmin } from "@/lib/session";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { TeacherAssignments, StudentEnrollments } from "@/components/subjects/SubjectAssignments";

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const detail = await getSubjectDetail(id);
  if (!detail) notFound();

  const { subject, allTeachers, allStudents } = detail;
  const assignedTeacherIds = subject.teachers.map((t) => t.teacherId);
  const enrolledStudentIds = subject.enrollments.map((e) => e.studentId);

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{subject.name}</h1>
        <p className="text-sm text-muted-foreground">إسناد المعلمين وتسجيل الطلاب في هذه المادة.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="المعلمون المسندون" subtitle="حدد المعلمين الذين يدرّسون هذه المادة" />
          <CardBody>
            <TeacherAssignments subjectId={subject.id} allTeachers={allTeachers} assignedTeacherIds={assignedTeacherIds} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="الطلاب المسجلون" subtitle="حدد الطلاب المسجلين في هذه المادة" />
          <CardBody>
            <StudentEnrollments subjectId={subject.id} allStudents={allStudents} enrolledStudentIds={enrolledStudentIds} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
