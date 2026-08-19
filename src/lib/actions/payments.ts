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
