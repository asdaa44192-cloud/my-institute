export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "نقدًا",
  bank_transfer: "تحويل بنكي",
  card: "بطاقة",
  other: "أخرى",
};

export function paymentMethodLabel(method: string) {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export const ATTENDANCE_STATUS_LABELS: Record<"PRESENT" | "ABSENT" | "LATE", string> = {
  PRESENT: "حاضر",
  ABSENT: "غائب",
  LATE: "متأخر",
};

export const ROLE_LABELS: Record<"ADMIN" | "TEACHER" | "STUDENT", string> = {
  ADMIN: "مسؤول",
  TEACHER: "معلم",
  STUDENT: "طالب",
};
