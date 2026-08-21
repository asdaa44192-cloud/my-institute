import { listUsers } from "@/lib/actions/users";
import { listSubjects } from "@/lib/actions/subjects";
import { requireAdmin } from "@/lib/session";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { CreateUserForm } from "@/components/settings/CreateUserForm";
import { DeleteUserButton } from "@/components/settings/DeleteUserButton";
import { InviteButton } from "@/components/settings/InviteButton";
import { formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/labels";

function accountStatus(u: { hasPassword: boolean; inviteTokenExpiresAt: Date | null }) {
  if (u.hasPassword) return { label: "نشط", color: "green" as const, pulse: false };
  if (u.inviteTokenExpiresAt && u.inviteTokenExpiresAt > new Date()) {
    return { label: "دعوة معلّقة", color: "amber" as const, pulse: true };
  }
  return { label: "لم تُرسل الدعوة", color: "slate" as const, pulse: false };
}

export default async function SettingsPage() {
  const currentUser = await requireAdmin();
  const [users, subjects] = await Promise.all([listUsers(), listSubjects()]);

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div>
        <h1 className="text-xl font-semibold text-foreground">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">إدارة حسابات المعلمين والطلاب والمسؤولين (التحكم بالصلاحيات حسب الدور).</p>
      </div>

      <Card>
        <CardHeader title="إضافة مستخدم" subtitle="منح صلاحية مسؤول أو معلم أو طالب للنظام" />
        <CardBody>
          <CreateUserForm subjects={subjects} />
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="جميع المستخدمين" />
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="h-auto py-3 ps-4">الاسم</TableHead>
              <TableHead className="h-auto py-3">البريد الإلكتروني</TableHead>
              <TableHead className="h-auto py-3">الهاتف</TableHead>
              <TableHead className="h-auto py-3">الدور</TableHead>
              <TableHead className="h-auto py-3">الحالة</TableHead>
              <TableHead className="h-auto py-3">تاريخ الإضافة</TableHead>
              <TableHead className="h-auto py-3 pe-4 text-end">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const phone = u.phone ?? u.student?.parentPhone ?? null;
              const status = accountStatus(u);
              return (
                <TableRow key={u.id}>
                  <TableCell className="ps-4 font-medium text-foreground">
                    {u.name}
                    {u.student && <span className="text-xs font-normal text-muted-foreground"> ({u.student.name})</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{phone ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge color={u.role === "ADMIN" ? "indigo" : u.role === "TEACHER" ? "slate" : "amber"}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                      {u.student && (
                        <Badge color="slate">{u.student.grade || "بلا صف"}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color={status.color} pulse={status.pulse}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="pe-4 text-end">
                    <div className="flex items-center justify-start gap-3">
                      <InviteButton userId={u.id} isActive={u.hasPassword} />
                      <DeleteUserButton id={u.id} currentUserId={currentUser.id} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
