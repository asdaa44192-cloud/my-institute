export const IRAQI_GRADE_LEVELS = [
  "الأول ابتدائي",
  "الثاني ابتدائي",
  "الثالث ابتدائي",
  "الرابع ابتدائي",
  "الخامس ابتدائي",
  "السادس ابتدائي",
  "الأول متوسط",
  "الثاني متوسط",
  "الثالث متوسط",
  "الرابع إعدادي",
  "الخامس إعدادي",
  "السادس إعدادي",
] as const;

export function gradeSortIndex(grade: string) {
  const idx = IRAQI_GRADE_LEVELS.indexOf(grade as (typeof IRAQI_GRADE_LEVELS)[number]);
  return idx === -1 ? null : idx;
}
