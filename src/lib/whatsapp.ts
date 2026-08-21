const SITE_URL = "https://my-institute-app-al-qimah.vercel.app";
const SITE_FOOTER = `\n\n🌐 *الموقع الرسمي:* ${SITE_URL}`;

/**
 * Builds a wa.me deep link that opens WhatsApp with a pre-filled message.
 * Accepts loosely formatted phone numbers and strips everything but digits.
 * Local Iraqi numbers (starting with a trunk "0") get the 964 country code
 * substituted in, since wa.me requires the number in full international form.
 */
export function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/[^\d]/g, "");
  const clean = digits.startsWith("0") ? `964${digits.slice(1)}` : digits;
  const text = encodeURIComponent(message);
  return `https://wa.me/${clean}?text=${text}`;
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
  )}. يرجى ترتيب الدفع في أقرب وقت ممكن.\n\nشكراً لكم.${SITE_FOOTER}`;
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
  return `عزيزي ولي الأمر،\n\nنود إعلامكم بأن الطالب ${studentName} ${statusText} في مادة ${subject} بتاريخ ${date}.\n\nشكراً لكم.${SITE_FOOTER}`;
}

export function studentWelcomeMessage(params: {
  studentName: string;
  grade: string;
  parentPhone: string;
  studentPhone?: string | null;
  loginPhone?: string;
  password?: string;
}) {
  const { studentName, grade, parentPhone, studentPhone, loginPhone, password } = params;

  const details = [
    `*الاسم:* ${studentName}`,
    `*الصف:* ${grade}`,
    `*هاتف ولي الأمر:* ${parentPhone}`,
    studentPhone ? `*هاتف الطالب:* ${studentPhone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const credentials = loginPhone
    ? `\n\n🔐 *بيانات الدخول إلى بوابة الطالب:*\n*رقم الهاتف لتسجيل الدخول:* ${loginPhone}${
        password ? `\n*كلمة المرور:* ${password}` : ""
      }\n\nيرجى الاحتفاظ بهذه البيانات في مكان آمن وعدم مشاركتها مع أحد.`
    : "";

  return `🎓 *أهلاً وسهلاً بكم في معهد القمة التعليمي*\n\nيسعدنا إعلامكم بتسجيل الطالب التالي:\n\n${details}${credentials}\n\nنتمنى للطالب ${studentName} عاماً دراسياً موفقاً! 🌟${SITE_FOOTER}`;
}

export function studentCredentialsMessage(params: {
  studentName: string;
  grade: string;
  parentPhone: string;
  password: string;
}) {
  const { studentName, grade, parentPhone, password } = params;
  return `مرحباً بك في معهد القمة ✨\n\nإليك تفاصيل حسابك:\n• اسم الطالب: ${studentName}\n• الصف: ${grade}\n• هاتف ولي الأمر: ${parentPhone}\n• كلمة المرور: ${password}\n\nنتمنى لك التوفيق والنجاح!${SITE_FOOTER}`;
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
  )}.\n\nشكراً لدفعتكم.${SITE_FOOTER}`;
}
