/**
 * Builds a wa.me deep link that opens WhatsApp with a pre-filled message.
 * Accepts loosely formatted phone numbers and strips everything but digits.
 */
export function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/[^\d]/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${text}`;
}

export function inviteMessage(params: { name: string; url: string; isReset: boolean }) {
  const { name, url, isReset } = params;
  const intro = isReset
    ? `مرحباً ${name}،\n\nتم إصدار رابط جديد لإعادة تعيين كلمة المرور الخاصة بحسابك في معهد القمة التعليمي.`
    : `مرحباً ${name}،\n\nتم إنشاء حساب لك في معهد القمة التعليمي.`;
  return `${intro}\n\nاضغط على الرابط التالي لتعيين كلمة المرور الخاصة بك:\n${url}\n\nهذا الرابط صالح لمدة 7 أيام.`;
}

export function paymentReminderMessage(params: {
  studentName: string;
  grade: string;
  remaining: number;
}) {
  const { studentName, grade, remaining } = params;
  return `عزيزي ولي الأمر،\n\nهذا تذكير بأن الطالب ${studentName} (${grade}) لديه رصيد مستحق من الرسوم الدراسية بقيمة $${remaining.toFixed(
    2
  )}. يرجى ترتيب الدفع في أقرب وقت ممكن.\n\nشكراً لكم.`;
}

export function attendanceAlertMessage(params: {
  studentName: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  subject: string;
}) {
  const { studentName, date, status, subject } = params;
  const statusText =
    status === "PRESENT" ? "كان حاضراً" : status === "LATE" ? "وصل متأخراً" : "كان غائباً";
  return `عزيزي ولي الأمر،\n\nنود إعلامكم بأن الطالب ${studentName} ${statusText} في مادة ${subject} بتاريخ ${date}.\n\nشكراً لكم.`;
}

export function receiptMessage(params: {
  studentName: string;
  amount: number;
  date: string;
  remaining: number;
}) {
  const { studentName, amount, date, remaining } = params;
  return `عزيزي ولي الأمر،\n\nنؤكد استلام مبلغ $${amount.toFixed(
    2
  )} عن الطالب ${studentName} بتاريخ ${date}. الرصيد المتبقي: $${remaining.toFixed(
    2
  )}.\n\nشكراً لدفعتكم.`;
}
