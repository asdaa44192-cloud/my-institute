import { getSubjectsForCurrentUser } from "@/lib/actions/subjects";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { AttendanceGrid } from "@/components/attendance/AttendanceGrid";
import { IRAQI_GRADE_LEVELS } from "@/lib/grades";

export default async function AttendancePage() {
  const subjects = await getSubjectsForCurrentUser();

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div>
        <h1 className="text-xl font-semibold text-foreground">الحضور</h1>
        <p className="text-sm text-muted-foreground">تسجيل الحضور اليومي لكل مادة أو صف.</p>
      </div>

      <Card>
        <CardHeader title="تسجيل الحضور" />
        <CardBody>
          <AttendanceGrid grades={IRAQI_GRADE_LEVELS} subjects={subjects} />
        </CardBody>
      </Card>
    </div>
  );
}
