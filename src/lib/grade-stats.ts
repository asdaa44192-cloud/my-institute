export type GradeRecordScore = { subject: string; score: number; maxScore: number };

export function computeGradeStats(records: GradeRecordScore[]) {
  const bySubject = new Map<string, { total: number; count: number }>();
  for (const r of records) {
    const pct = (r.score / r.maxScore) * 100;
    const entry = bySubject.get(r.subject) ?? { total: 0, count: 0 };
    entry.total += pct;
    entry.count += 1;
    bySubject.set(r.subject, entry);
  }

  return Array.from(bySubject.entries())
    .map(([subject, { total, count }]) => ({ subject, average: Math.round(total / count) }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}
