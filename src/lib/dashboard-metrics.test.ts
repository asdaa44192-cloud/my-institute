import { describe, expect, it } from "vitest";
import { computeDashboardMetrics, type StudentWithPayments } from "./dashboard-metrics";

const NOW = new Date("2026-08-19T00:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function student(overrides: Partial<StudentWithPayments>): StudentWithPayments {
  return {
    id: "s1",
    name: "Test Student",
    grade: "Grade 5",
    totalFee: 1000,
    enrollDate: daysAgo(100),
    parentPhone: "15550000000",
    payments: [],
    ...overrides,
  };
}

describe("computeDashboardMetrics", () => {
  it("counts total students and buckets enrollment by grade, sorted", () => {
    const { totalStudents, enrollmentChartData } = computeDashboardMetrics(
      [
        student({ id: "1", grade: "Grade 8" }),
        student({ id: "2", grade: "Grade 5" }),
        student({ id: "3", grade: "Grade 5" }),
      ],
      NOW
    );
    expect(totalStudents).toBe(3);
    expect(enrollmentChartData).toEqual([
      { grade: "Grade 5", count: 2 },
      { grade: "Grade 8", count: 1 },
    ]);
  });

  it("sums remaining balance only for students who still owe money", () => {
    const { unpaidBalance } = computeDashboardMetrics(
      [
        student({ id: "1", totalFee: 1000, payments: [{ amount: 1000, date: daysAgo(5) }] }), // paid off
        student({ id: "2", totalFee: 1000, payments: [{ amount: 300, date: daysAgo(5) }] }), // owes 700
      ],
      NOW
    );
    expect(unpaidBalance).toBe(700);
  });

  it("counts only this-calendar-month payments toward monthly income", () => {
    const thisMonth = new Date(NOW.getFullYear(), NOW.getMonth(), 5);
    const lastMonth = new Date(NOW.getFullYear(), NOW.getMonth() - 1, 20);
    const { monthlyIncome } = computeDashboardMetrics(
      [student({ payments: [{ amount: 200, date: thisMonth }, { amount: 500, date: lastMonth }] })],
      NOW
    );
    expect(monthlyIncome).toBe(200);
  });

  it("flags a student overdue once 30+ days have passed since their last payment", () => {
    const { overdue } = computeDashboardMetrics(
      [
        student({ id: "1", name: "Recently Paid", totalFee: 500, payments: [{ amount: 100, date: daysAgo(10) }] }),
        student({ id: "2", name: "Long Overdue", totalFee: 500, payments: [{ amount: 100, date: daysAgo(45) }] }),
      ],
      NOW
    );
    expect(overdue).toHaveLength(1);
    expect(overdue[0].name).toBe("Long Overdue");
    expect(overdue[0].remaining).toBe(400);
    expect(overdue[0].daysSince).toBe(45);
  });

  it("uses enrollDate as the overdue clock when a student has never paid", () => {
    const { overdue } = computeDashboardMetrics(
      [student({ id: "1", name: "Never Paid", totalFee: 500, enrollDate: daysAgo(60), payments: [] })],
      NOW
    );
    expect(overdue).toHaveLength(1);
    expect(overdue[0].daysSince).toBe(60);
  });

  it("never flags a fully-paid student as overdue regardless of last activity", () => {
    const { overdue } = computeDashboardMetrics(
      [student({ totalFee: 500, payments: [{ amount: 500, date: daysAgo(90) }] })],
      NOW
    );
    expect(overdue).toHaveLength(0);
  });

  it("sorts overdue students by days-since descending", () => {
    const { overdue } = computeDashboardMetrics(
      [
        student({ id: "1", name: "A", totalFee: 100, payments: [{ amount: 0, date: daysAgo(31) }] }),
        student({ id: "2", name: "B", totalFee: 100, payments: [{ amount: 0, date: daysAgo(90) }] }),
      ],
      NOW
    );
    expect(overdue.map((o) => o.name)).toEqual(["B", "A"]);
  });
});
