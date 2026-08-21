"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const paymentSchema = z.object({
  studentId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.string().min(1),
  method: z.string().min(1),
  note: z.string().optional(),
});

export type FinancePayment = {
  id: string;
  amount: number;
  date: Date;
  note: string | null;
};

export type FinanceStudent = {
  id: string;
  name: string;
  grade: string;
  parentPhone: string;
  totalFee: number;
  paid: number;
  remaining: number;
  paymentCount: number;
  lastPaymentDate: Date | null;
  subjects: { id: string; name: string }[];
  payments: FinancePayment[];
};

/** Every active student with their fee/payment totals, for the finance table. Filtering
 * (search, status, grade, subject) happens client-side since the dataset is institute-sized. */
export async function getFinanceData(): Promise<FinanceStudent[]> {
  await requireAdmin();

  const students = await prisma.student.findMany({
    where: { active: true },
    include: {
      payments: { orderBy: { date: "desc" } },
      subjects: { include: { subject: true } },
    },
    orderBy: { name: "asc" },
  });

  return students.map((s) => {
    const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
    return {
      id: s.id,
      name: s.name,
      grade: s.grade,
      parentPhone: s.parentPhone,
      totalFee: s.totalFee,
      paid,
      remaining: s.totalFee - paid,
      paymentCount: s.payments.length,
      lastPaymentDate: s.payments[0]?.date ?? null,
      subjects: s.subjects.map((ss) => ({ id: ss.subject.id, name: ss.subject.name })),
      payments: s.payments.map((p) => ({ id: p.id, amount: p.amount, date: p.date, note: p.note })),
    };
  });
}

const financeUpdateSchema = z.object({
  studentId: z.string().min(1),
  totalFee: z.coerce.number().min(0, "Total fee cannot be negative"),
  amount: z.coerce.number().min(0).optional(),
  date: z.string().optional(),
  note: z.string().optional(),
});

/** Combined fee-adjustment + new-installment save for the finance table's modal.
 * One Server Action instead of two client-dispatched calls: Next.js dispatches Server
 * Actions from the client sequentially, so bundling both mutations into a single
 * transaction is both simpler and avoids an extra round trip. */
export async function saveStudentPayment(formData: FormData) {
  await requireAdmin();

  const parsed = financeUpdateSchema.safeParse({
    studentId: formData.get("studentId"),
    totalFee: formData.get("totalFee"),
    amount: formData.get("amount") || undefined,
    date: formData.get("date") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid payment data");
  }
  const { studentId, totalFee, amount, date, note } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUniqueOrThrow({ where: { id: studentId } });
    if (totalFee !== student.totalFee) {
      await tx.student.update({ where: { id: studentId }, data: { totalFee } });
    }
    if (amount && amount > 0) {
      await tx.payment.create({
        data: {
          studentId,
          amount,
          date: date ? new Date(date) : new Date(),
          method: "cash",
          note,
        },
      });
    }
  });

  revalidatePath("/payments");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/dashboard");
}

export async function getAllPayments() {
  await requireAdmin();
  return prisma.payment.findMany({
    include: { student: true },
    orderBy: { date: "desc" },
    take: 200,
  });
}

export async function addPayment(formData: FormData) {
  await requireAdmin();

  const parsed = paymentSchema.safeParse({
    studentId: formData.get("studentId"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    method: formData.get("method"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid payment data");
  }

  const payment = await prisma.payment.create({
    data: {
      studentId: parsed.data.studentId,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      method: parsed.data.method,
      note: parsed.data.note,
    },
  });

  revalidatePath(`/students/${parsed.data.studentId}`);
  revalidatePath("/payments");
  revalidatePath("/dashboard");

  return payment;
}

export async function deletePayment(id: string, studentId: string) {
  await requireAdmin();
  await prisma.payment.delete({ where: { id } });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}
