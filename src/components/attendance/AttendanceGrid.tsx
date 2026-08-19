"use client";

import { useEffect, useState, useTransition } from "react";
import { getAttendanceForClass, saveAttendance } from "@/lib/actions/attendance";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { attendanceAlertMessage } from "@/lib/whatsapp";
import { formatDateInput, cn } from "@/lib/utils";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/labels";

type Status = "PRESENT" | "ABSENT" | "LATE";
type Row = { student: { id: string; name: string; parentPhone: string }; status: Status | null };

const STATUS_STYLES: Record<Status, string> = {
  PRESENT: "bg-emerald-600 text-white",
  ABSENT: "bg-red-600 text-white",
  LATE: "bg-amber-500 text-white",
};

export function AttendanceGrid({
  grades,
  subjects,
}: {
  grades: readonly string[];
  subjects: { id: string; name: string }[];
}) {
  const [grade, setGrade] = useState(grades[0] ?? "");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? "";

  useEffect(() => {
    if (!grade || !subjectId || !date) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount loading/reset flags
    setLoading(true);
    setSaved(false);
    getAttendanceForClass(grade, subjectId, date)
      .then((data) => setRows(data as Row[]))
      .finally(() => setLoading(false));
  }, [grade, subjectId, date]);

  function setStatus(studentId: string, status: Status) {
    setRows((prev) => prev.map((r) => (r.student.id === studentId ? { ...r, status } : r)));
  }

  function handleSave() {
    const statuses = rows.filter((r) => r.status).map((r) => ({ studentId: r.student.id, status: r.status! }));
    startTransition(async () => {
      await saveAttendance(grade, subjectId, date, statuses);
      setSaved(true);
    });
  }

  if (subjects.length === 0) {
    return <p className="text-sm text-muted-foreground">لا توجد مواد دراسية مسندة إليك بعد.</p>;
  }

  return (
    <div dir="rtl" className="space-y-4 text-right">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">الصف</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          >
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">المادة</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">التاريخ</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <Button onClick={handleSave} disabled={pending || loading || rows.length === 0}>
          {pending ? "جارٍ الحفظ..." : "حفظ الحضور"}
        </Button>
        {saved && <span className="text-sm text-emerald-600">تم الحفظ ✓</span>}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">جارٍ تحميل الطلاب...</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد طلاب لهذا الصف.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">الطالب</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">الحالة</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">إشعار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.student.id}>
                  <td className="px-4 py-2 font-medium text-foreground">{r.student.name}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1.5">
                      {(["PRESENT", "LATE", "ABSENT"] as Status[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(r.student.id, s)}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                            r.status === s ? STATUS_STYLES[s] : "bg-muted text-muted-foreground hover:bg-slate-200"
                          )}
                        >
                          {ATTENDANCE_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-left">
                    {r.status && r.status !== "PRESENT" && (
                      <WhatsAppButton
                        compact
                        phone={r.student.parentPhone}
                        label="تنبيه"
                        message={attendanceAlertMessage({
                          studentName: r.student.name,
                          date,
                          status: r.status,
                          subject: subjectName,
                        })}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
