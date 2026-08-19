"use client";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type ReceiptData = {
  receiptNo: string;
  studentName: string;
  grade: string;
  amount: number;
  date: string;
  method: string;
  totalFee: number;
  paid: number;
  remaining: number;
};

export function ReceiptActions({ data }: { data: ReceiptData }) {
  async function downloadPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Payment Receipt", 20, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Receipt No: ${data.receiptNo}`, 20, 30);
    doc.text(`Date: ${formatDate(data.date)}`, 20, 36);

    doc.setDrawColor(220);
    doc.line(20, 42, 190, 42);

    doc.setFontSize(12);
    doc.setTextColor(20);
    let y = 54;
    const row = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, 80, y);
      y += 9;
    };

    row("Student:", data.studentName);
    row("Grade / Stage:", data.grade);
    row("Payment Method:", data.method);
    row("Amount Paid:", `$${data.amount.toFixed(2)}`);
    y += 4;
    doc.line(20, y, 190, y);
    y += 10;
    row("Total Tuition Fee:", `$${data.totalFee.toFixed(2)}`);
    row("Total Paid to Date:", `$${data.paid.toFixed(2)}`);
    row("Remaining Balance:", `$${data.remaining.toFixed(2)}`);

    y += 15;
    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.text("Thank you for your payment.", 20, y);

    doc.save(`receipt-${data.receiptNo}.pdf`);
  }

  return (
    <div className="no-print flex gap-2">
      <Button variant="secondary" onClick={() => window.print()}>
        طباعة
      </Button>
      <Button onClick={downloadPdf}>تحميل PDF</Button>
    </div>
  );
}
