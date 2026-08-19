import { gradeSortIndex } from "@/lib/grades";

const OVERDUE_DAYS = 30;

export type StudentWithPayments = {
  id: string;
  name: string;
  grade: string;
  totalFee: number;
  enrollDate: Date;
  parentPhone: string;
  payments: { amount: number; date: Date }[];
};

export type OverdueEntry = {
  id: string;
  name: string;
  grade: string;
  remaining: number;
  daysSince: number;
  parentPhone: string;
};

export function computeDashboardMetrics(students: StudentWithPayments[], now: Date) {
  const totalStudents = students.length;

  const enrollmentByGrade = students.reduce<Record<string, number>>((acc, s) => {
    acc[s.grade] = (acc[s.grade] ?? 0) + 1;
    return acc;
  }, {});
  const enrollmentChartData = Object.entries(enrollmentByGrade)
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => {
      const ai = gradeSortIndex(a.grade);
      const bi = gradeSortIndex(b.grade);
      if (ai !== null && bi !== null) return ai - bi;
      if (ai !== null) return -1;
      if (bi !== null) return 1;
      return a.grade.localeCompare(b.grade);
    });

  let unpaidBalance = 0;
  let monthlyIncome = 0;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const overdue: OverdueEntry[] = [];

  for (const s of students) {
    const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = s.totalFee - paid;
    if (remaining > 0) unpaidBalance += remaining;

    for (const p of s.payments) {
      if (p.date >= monthStart) monthlyIncome += p.amount;
    }

    if (remaining > 0) {
      const lastActivity = s.payments.length
        ? s.payments.reduce((a, b) => (a.date > b.date ? a : b)).date
        : s.enrollDate;
      const daysSince = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= OVERDUE_DAYS) {
        overdue.push({
          id: s.id,
          name: s.name,
          grade: s.grade,
          remaining,
          daysSince,
          parentPhone: s.parentPhone,
        });
      }
    }
  }
  overdue.sort((a, b) => b.daysSince - a.daysSince);

  return { totalStudents, unpaidBalance, monthlyIncome, enrollmentChartData, overdue };
}
