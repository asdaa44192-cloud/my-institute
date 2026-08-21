import { getFinanceData } from "@/lib/actions/payments";
import { listSubjects } from "@/lib/actions/subjects";
import { requireAdmin } from "@/lib/session";
import { FinanceDashboard } from "@/components/payments/FinanceDashboard";

export default async function PaymentsPage() {
  await requireAdmin();
  const [students, subjects] = await Promise.all([getFinanceData(), listSubjects()]);

  return (
    <FinanceDashboard
      students={students}
      subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
