import Link from "next/link";
import { getStudents } from "@/lib/actions/students";
import { getCurrentUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { IRAQI_GRADE_LEVELS } from "@/lib/grades";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; grade?: string }>;
}) {
  const { search, grade } = await searchParams;
  const [students, user] = await Promise.all([getStudents({ search, grade }), getCurrentUser()]);
  const isAdmin = user?.role === "ADMIN";

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">الطلاب</h1>
          <p className="text-sm text-muted-foreground">{students.length} طالب نشط</p>
        </div>
        {isAdmin && (
          <Link href="/students/new">
            <Button>+ إضافة طالب</Button>
          </Link>
        )}
      </div>

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="w-full min-w-[200px] flex-1 sm:w-auto">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">البحث بالاسم أو رقم هاتف ولي الأمر</label>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="مثال: أمينة، +1555..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">الصف</label>
            <select
              name="grade"
              defaultValue={grade ?? ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="">كل الصفوف</option>
              {IRAQI_GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary">
            تصفية
          </Button>
          {(search || grade) && (
            <Link href="/students" className="text-sm text-muted-foreground hover:text-foreground">
              مسح
            </Link>
          )}
        </form>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="h-auto py-3 ps-4">الاسم</TableHead>
              <TableHead className="h-auto py-3">الصف</TableHead>
              <TableHead className="h-auto py-3">هاتف ولي الأمر</TableHead>
              {isAdmin && <TableHead className="h-auto py-3 pe-4 text-end">الرصيد المتبقي</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="ps-4">
                  <Link href={`/students/${s.id}`} className="font-medium text-foreground hover:text-primary">
                    {s.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.grade}</TableCell>
                <TableCell className="text-muted-foreground">{s.parentPhone}</TableCell>
                {isAdmin && (
                  <TableCell className="pe-4 text-end">
                    {s.remaining > 0 ? (
                      <Badge color="red">{formatCurrency(s.remaining)}</Badge>
                    ) : (
                      <Badge color="green">مدفوع</Badge>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  لا يوجد طلاب.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
