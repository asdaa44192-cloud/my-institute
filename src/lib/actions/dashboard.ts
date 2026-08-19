"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { computeDashboardMetrics } from "@/lib/dashboard-metrics";

export async function getDashboardData() {
  const user = await requireStaff();

  const students = await prisma.student.findMany({
    where: { active: true },
    include: { payments: true },
  });

  return { role: user.role, ...computeDashboardMetrics(students, new Date()) };
}
