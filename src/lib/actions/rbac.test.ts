import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// requireUser()/requireAdmin() call getServerSession(authOptions) — we control
// the "logged in as" identity per test by mocking the session it returns.
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// redirect() halts execution by throwing in real Next.js. We mirror that so
// requireAdmin/requireUser actually stop the action, and assert on the target.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  createStudent,
  createStudentWithLogin,
  updateStudent,
  deactivateStudent,
  deleteStudent,
  getStudents,
  getStudentById,
  getMyStudentProfile,
} from "@/lib/actions/students";
import { addPayment, deletePayment, getAllPayments, getFinanceData, saveStudentPayment } from "@/lib/actions/payments";
import { addGrade } from "@/lib/actions/grades";
import { saveAttendance } from "@/lib/actions/attendance";
import { createUser, deleteUser, listUsers } from "@/lib/actions/users";
import { assignTeacherToSubject, enrollStudentInSubject } from "@/lib/actions/subjects";
import { createInvitation, completeInvitation } from "@/lib/actions/invitations";

const mockSession = vi.mocked(getServerSession);

function asAdmin(id = "admin-1") {
  mockSession.mockResolvedValue({
    user: { id, role: "ADMIN", name: "Admin", email: "admin@test.com" },
  } as never);
}
function asTeacher(id = "teacher-1") {
  mockSession.mockResolvedValue({
    user: { id, role: "TEACHER", name: "Teacher", email: "teacher@test.com" },
  } as never);
}
function asStudent(id: string, studentId: string) {
  mockSession.mockResolvedValue({
    user: { id, role: "STUDENT", studentId, name: "Student", email: "student@test.com" },
  } as never);
}
function asAnonymous() {
  mockSession.mockResolvedValue(null);
}

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

async function seedStudent(overrides: Partial<{ name: string; grade: string; parentPhone: string; totalFee: number }> = {}) {
  return prisma.student.create({
    data: {
      name: "Test Student",
      grade: "Grade 5",
      parentPhone: "+15550000000",
      totalFee: 500,
      ...overrides,
    },
  });
}

async function seedSubject(name = "Mathematics") {
  return prisma.subject.create({ data: { name } });
}

beforeEach(async () => {
  vi.clearAllMocks();
  await prisma.payment.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.gradeRecord.deleteMany();
  await prisma.studentSubject.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("createStudent (admin-only; redirects on both success and failure)", () => {
  const validForm = () =>
    formData({ name: "New Student", grade: "Grade 5", parentPhone: "+15550000000", totalFee: "1000" });

  it("blocks teachers and writes nothing", async () => {
    asTeacher();
    await expect(createStudent(validForm())).rejects.toThrow("REDIRECT:/dashboard");
    expect(await prisma.student.count()).toBe(0);
  });

  it("blocks anonymous callers", async () => {
    asAnonymous();
    await expect(createStudent(validForm())).rejects.toThrow("REDIRECT:/login");
    expect(await prisma.student.count()).toBe(0);
  });

  it("allows admin to create the student", async () => {
    asAdmin();
    await expect(createStudent(validForm())).rejects.toThrow(/^REDIRECT:\/students\//);
    const student = await prisma.student.findFirst();
    expect(student?.name).toBe("New Student");
  });
});

describe("updateStudent (admin-only; redirects on both success and failure)", () => {
  const editForm = () =>
    formData({ name: "Changed Name", grade: "Grade 6", parentPhone: "+15550000001", totalFee: "200" });

  it("blocks teachers and leaves the record untouched", async () => {
    const student = await seedStudent();
    asTeacher();
    await expect(updateStudent(student.id, editForm())).rejects.toThrow("REDIRECT:/dashboard");
    expect((await prisma.student.findUnique({ where: { id: student.id } }))?.name).toBe("Test Student");
  });

  it("allows admin to update the record", async () => {
    const student = await seedStudent();
    asAdmin();
    await expect(updateStudent(student.id, editForm())).rejects.toThrow(`REDIRECT:/students/${student.id}`);
    expect((await prisma.student.findUnique({ where: { id: student.id } }))?.name).toBe("Changed Name");
  });
});

describe("deactivateStudent (admin-only; redirects on both success and failure)", () => {
  it("blocks teachers and keeps the student active", async () => {
    const student = await seedStudent();
    asTeacher();
    await expect(deactivateStudent(student.id)).rejects.toThrow("REDIRECT:/dashboard");
    expect((await prisma.student.findUnique({ where: { id: student.id } }))?.active).toBe(true);
  });

  it("allows admin to deactivate the student", async () => {
    const student = await seedStudent();
    asAdmin();
    await expect(deactivateStudent(student.id)).rejects.toThrow("REDIRECT:/students");
    expect((await prisma.student.findUnique({ where: { id: student.id } }))?.active).toBe(false);
  });
});

describe("createStudentWithLogin (admin-only; phone + password, no email)", () => {
  const formWithLogin = (overrides: Record<string, string> = {}) =>
    formData({
      name: "New Student",
      grade: "Grade 5",
      parentPhone: "+15550000000",
      totalFee: "1000",
      loginPhone: "+1 555 123 4567",
      password: "testpass123",
      ...overrides,
    });

  it("creates the student and a phone-based login, with no email set", async () => {
    asAdmin();
    const result = await createStudentWithLogin(formWithLogin());
    expect(result.loginPhone).toBe("+1 555 123 4567");

    const login = await prisma.user.findFirst({ where: { studentId: result.id } });
    expect(login?.role).toBe("STUDENT");
    expect(login?.email).toBeNull();
    expect(login?.phone).toBe("+1 555 123 4567");
    expect(login?.passwordHash).toBeTruthy();
  });

  it("creates the student profile only when no login phone/password is given", async () => {
    asAdmin();
    const result = await createStudentWithLogin(
      formData({ name: "No Login", grade: "Grade 5", parentPhone: "+15550000000", totalFee: "1000" })
    );
    expect(result.loginPhone).toBeUndefined();
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects a login phone that's already in use, tolerating different formatting", async () => {
    asAdmin();
    await createStudentWithLogin(formWithLogin());
    await expect(
      createStudentWithLogin(formWithLogin({ name: "Second Student", loginPhone: "15551234567" }))
    ).rejects.toThrow("يوجد مستخدم بهذا رقم الهاتف مسبقاً");
  });

  it("blocks teachers from creating a student login", async () => {
    asTeacher();
    await expect(createStudentWithLogin(formWithLogin())).rejects.toThrow("REDIRECT:/dashboard");
    expect(await prisma.student.count()).toBe(0);
  });
});

describe("deleteStudent (admin-only; permanently removes the student and their login)", () => {
  it("blocks teachers and leaves the student intact", async () => {
    const student = await seedStudent();
    asTeacher();
    await expect(deleteStudent(student.id)).rejects.toThrow("REDIRECT:/dashboard");
    expect(await prisma.student.findUnique({ where: { id: student.id } })).not.toBeNull();
  });

  it("permanently deletes the student and cascades related records", async () => {
    const student = await seedStudent();
    await prisma.payment.create({ data: { studentId: student.id, amount: 50 } });
    asAdmin();

    await deleteStudent(student.id);

    expect(await prisma.student.findUnique({ where: { id: student.id } })).toBeNull();
    expect(await prisma.payment.count()).toBe(0);
  });

  it("also deletes the student's login account, not just detaching it", async () => {
    const student = await seedStudent();
    const login = await prisma.user.create({
      data: { name: student.name, phone: "+15559998888", passwordHash: "x", role: "STUDENT", studentId: student.id },
    });
    asAdmin();

    await deleteStudent(student.id);

    expect(await prisma.user.findUnique({ where: { id: login.id } })).toBeNull();
  });
});

describe("getStudents (staff-only; scoped to a teacher's assigned subjects)", () => {
  it("blocks anonymous callers", async () => {
    asAnonymous();
    await expect(getStudents()).rejects.toThrow("REDIRECT:/login");
  });

  it("blocks students from reading the roster", async () => {
    asStudent("student-user-1", "some-student-id");
    await expect(getStudents()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("admin sees every active student", async () => {
    await seedStudent();
    asAdmin();
    await expect(getStudents()).resolves.toHaveLength(1);
  });

  it("teacher only sees students enrolled in one of their assigned subjects", async () => {
    const subject = await seedSubject();
    const otherSubject = await seedSubject("Science");
    const enrolled = await seedStudent({ name: "Enrolled Student" });
    const notEnrolled = await seedStudent({ name: "Other Student" });
    await prisma.studentSubject.create({ data: { studentId: enrolled.id, subjectId: subject.id } });
    await prisma.studentSubject.create({ data: { studentId: notEnrolled.id, subjectId: otherSubject.id } });

    const teacher = await prisma.user.create({
      data: { name: "Teacher", email: "teacher@test.com", passwordHash: "x", role: "TEACHER" },
    });
    await prisma.teacherSubject.create({ data: { teacherId: teacher.id, subjectId: subject.id } });
    asTeacher(teacher.id);

    const result = await getStudents();
    expect(result.map((s) => s.name)).toEqual(["Enrolled Student"]);
  });
});

describe("getStudentById (row-level scoping)", () => {
  it("a student can only fetch their own profile", async () => {
    const own = await seedStudent({ name: "Own Student" });
    const other = await seedStudent({ name: "Other Student" });
    asStudent("student-user-1", own.id);

    await expect(getStudentById(own.id)).resolves.toMatchObject({ name: "Own Student" });
    await expect(getStudentById(other.id)).resolves.toBeNull();
  });

  it("a teacher can only fetch students enrolled in their subjects", async () => {
    const subject = await seedSubject();
    const enrolled = await seedStudent({ name: "Enrolled Student" });
    const notEnrolled = await seedStudent({ name: "Other Student" });
    await prisma.studentSubject.create({ data: { studentId: enrolled.id, subjectId: subject.id } });

    const teacher = await prisma.user.create({
      data: { name: "Teacher", email: "teacher@test.com", passwordHash: "x", role: "TEACHER" },
    });
    await prisma.teacherSubject.create({ data: { teacherId: teacher.id, subjectId: subject.id } });
    asTeacher(teacher.id);

    await expect(getStudentById(enrolled.id)).resolves.toMatchObject({ name: "Enrolled Student" });
    await expect(getStudentById(notEnrolled.id)).resolves.toBeNull();
  });

  it("admin can fetch any student", async () => {
    const student = await seedStudent();
    asAdmin();
    await expect(getStudentById(student.id)).resolves.toMatchObject({ name: "Test Student" });
  });
});

describe("getMyStudentProfile (a STUDENT with no linked profile is a broken invariant, not a redirect loop)", () => {
  it("redirects to /login instead of back to /dashboard — its only caller — when studentId is missing", async () => {
    // Nothing in the app can produce a STUDENT user with no linked Student
    // profile, but if that ever happened (e.g. a role edited directly in the
    // DB), redirecting to /dashboard here would loop forever, since /dashboard
    // is the only place that calls this.
    mockSession.mockResolvedValue({
      user: { id: "broken-1", role: "STUDENT", studentId: null, name: "Broken", email: "broken@test.com" },
    } as never);
    await expect(getMyStudentProfile()).rejects.toThrow("REDIRECT:/login");
  });
});

describe("addPayment (admin-only)", () => {
  it("blocks teachers and records nothing", async () => {
    const student = await seedStudent();
    asTeacher();
    const fd = formData({ studentId: student.id, amount: "100", date: "2026-08-19", method: "cash" });
    await expect(addPayment(fd)).rejects.toThrow("REDIRECT:/dashboard");
    expect(await prisma.payment.count()).toBe(0);
  });

  it("blocks anonymous callers", async () => {
    const student = await seedStudent();
    asAnonymous();
    const fd = formData({ studentId: student.id, amount: "100", date: "2026-08-19", method: "cash" });
    await expect(addPayment(fd)).rejects.toThrow("REDIRECT:/login");
    expect(await prisma.payment.count()).toBe(0);
  });

  it("allows admin to record the payment", async () => {
    const student = await seedStudent();
    asAdmin();
    const fd = formData({ studentId: student.id, amount: "100", date: "2026-08-19", method: "cash" });
    const payment = await addPayment(fd);
    expect(payment.amount).toBe(100);
    expect(await prisma.payment.count()).toBe(1);
  });
});

describe("deletePayment (admin-only)", () => {
  it("blocks teachers and keeps the payment", async () => {
    const student = await seedStudent();
    const payment = await prisma.payment.create({ data: { studentId: student.id, amount: 50 } });
    asTeacher();
    await expect(deletePayment(payment.id, student.id)).rejects.toThrow("REDIRECT:/dashboard");
    expect(await prisma.payment.findUnique({ where: { id: payment.id } })).not.toBeNull();
  });

  it("allows admin to delete the payment", async () => {
    const student = await seedStudent();
    const payment = await prisma.payment.create({ data: { studentId: student.id, amount: 50 } });
    asAdmin();
    await deletePayment(payment.id, student.id);
    expect(await prisma.payment.findUnique({ where: { id: payment.id } })).toBeNull();
  });
});

describe("getAllPayments (admin-only read — the financial ledger itself)", () => {
  it("blocks teachers from reading the ledger", async () => {
    asTeacher();
    await expect(getAllPayments()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("allows admin to read the ledger", async () => {
    asAdmin();
    await expect(getAllPayments()).resolves.toEqual([]);
  });
});

describe("getFinanceData (admin-only read — the finance table)", () => {
  it("blocks teachers from reading finance data", async () => {
    asTeacher();
    await expect(getFinanceData()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("allows admin and returns computed totals per student", async () => {
    const student = await seedStudent({ totalFee: 300 });
    await prisma.payment.create({ data: { studentId: student.id, amount: 120 } });
    asAdmin();
    const [row] = await getFinanceData();
    expect(row).toMatchObject({ id: student.id, totalFee: 300, paid: 120, remaining: 180, paymentCount: 1 });
  });
});

describe("saveStudentPayment (admin-only fee adjustment + payment)", () => {
  it("blocks teachers and changes nothing", async () => {
    const student = await seedStudent({ totalFee: 300 });
    asTeacher();
    const fd = formData({ studentId: student.id, totalFee: "250", amount: "100", date: "2026-08-19" });
    await expect(saveStudentPayment(fd)).rejects.toThrow("REDIRECT:/dashboard");
    expect(await prisma.payment.count()).toBe(0);
    expect((await prisma.student.findUniqueOrThrow({ where: { id: student.id } })).totalFee).toBe(300);
  });

  it("allows admin to adjust the fee and record a payment in one call", async () => {
    const student = await seedStudent({ totalFee: 300 });
    asAdmin();
    const fd = formData({ studentId: student.id, totalFee: "250", amount: "100", date: "2026-08-19", note: "قسط" });
    await saveStudentPayment(fd);

    const updated = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(updated.totalFee).toBe(250);
    expect(await prisma.payment.count()).toBe(1);
    const payment = await prisma.payment.findFirstOrThrow({ where: { studentId: student.id } });
    expect(payment.amount).toBe(100);
    expect(payment.note).toBe("قسط");
  });

  it("allows adjusting the fee alone, without a new payment", async () => {
    const student = await seedStudent({ totalFee: 300 });
    asAdmin();
    const fd = formData({ studentId: student.id, totalFee: "200" });
    await saveStudentPayment(fd);

    expect((await prisma.student.findUniqueOrThrow({ where: { id: student.id } })).totalFee).toBe(200);
    expect(await prisma.payment.count()).toBe(0);
  });
});

describe("addGrade (staff-only; teacher must be assigned to the subject)", () => {
  it("blocks anonymous callers", async () => {
    asAnonymous();
    const fd = formData({ studentId: "missing", subjectId: "missing", examName: "Quiz", score: "8", maxScore: "10" });
    await expect(addGrade(fd)).rejects.toThrow("REDIRECT:/login");
  });

  it("blocks students from recording a grade", async () => {
    asStudent("student-user-1", "some-student-id");
    const fd = formData({ studentId: "missing", subjectId: "missing", examName: "Quiz", score: "8", maxScore: "10" });
    await expect(addGrade(fd)).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("allows a teacher assigned to the subject to record a grade", async () => {
    const student = await seedStudent();
    const subject = await seedSubject();
    const teacher = await prisma.user.create({
      data: { name: "Teacher", email: "teacher@test.com", passwordHash: "x", role: "TEACHER" },
    });
    await prisma.teacherSubject.create({ data: { teacherId: teacher.id, subjectId: subject.id } });
    asTeacher(teacher.id);

    const fd = formData({ studentId: student.id, subjectId: subject.id, examName: "Quiz", score: "8", maxScore: "10" });
    await addGrade(fd);
    expect(await prisma.gradeRecord.count()).toBe(1);
  });

  it("blocks a teacher not assigned to the subject", async () => {
    const student = await seedStudent();
    const subject = await seedSubject();
    const teacher = await prisma.user.create({
      data: { name: "Teacher", email: "teacher@test.com", passwordHash: "x", role: "TEACHER" },
    });
    asTeacher(teacher.id);

    const fd = formData({ studentId: student.id, subjectId: subject.id, examName: "Quiz", score: "8", maxScore: "10" });
    await expect(addGrade(fd)).rejects.toThrow("You are not assigned to this subject");
    expect(await prisma.gradeRecord.count()).toBe(0);
  });
});

describe("saveAttendance (staff-only; teacher must be assigned to the subject)", () => {
  it("blocks anonymous callers", async () => {
    asAnonymous();
    await expect(saveAttendance("Grade 5", "missing", "2026-08-19", [])).rejects.toThrow("REDIRECT:/login");
  });

  it("blocks students from saving attendance", async () => {
    asStudent("student-user-1", "some-student-id");
    await expect(saveAttendance("Grade 5", "missing", "2026-08-19", [])).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("allows a teacher assigned to the subject to save attendance", async () => {
    const student = await seedStudent();
    const subject = await seedSubject();
    const teacher = await prisma.user.create({
      data: { name: "Teacher", email: "teacher@test.com", passwordHash: "x", role: "TEACHER" },
    });
    await prisma.teacherSubject.create({ data: { teacherId: teacher.id, subjectId: subject.id } });
    asTeacher(teacher.id);

    await saveAttendance("Grade 5", subject.id, "2026-08-19", [{ studentId: student.id, status: "PRESENT" }]);
    expect(await prisma.attendanceRecord.count()).toBe(1);
  });

  it("blocks a teacher not assigned to the subject", async () => {
    const student = await seedStudent();
    const subject = await seedSubject();
    const teacher = await prisma.user.create({
      data: { name: "Teacher", email: "teacher@test.com", passwordHash: "x", role: "TEACHER" },
    });
    asTeacher(teacher.id);

    await expect(
      saveAttendance("Grade 5", subject.id, "2026-08-19", [{ studentId: student.id, status: "PRESENT" }])
    ).rejects.toThrow("You are not assigned to this subject");
    expect(await prisma.attendanceRecord.count()).toBe(0);
  });
});

describe("subject assignment/enrollment (admin-only)", () => {
  it("blocks teachers from assigning themselves to a subject", async () => {
    const subject = await seedSubject();
    asTeacher();
    await expect(assignTeacherToSubject(subject.id, "teacher-1")).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("allows admin to assign a teacher and enroll a student", async () => {
    const subject = await seedSubject();
    const student = await seedStudent();
    const teacher = await prisma.user.create({
      data: { name: "Teacher", email: "teacher@test.com", passwordHash: "x", role: "TEACHER" },
    });
    asAdmin();

    await assignTeacherToSubject(subject.id, teacher.id);
    await enrollStudentInSubject(subject.id, student.id);

    expect(await prisma.teacherSubject.count()).toBe(1);
    expect(await prisma.studentSubject.count()).toBe(1);
  });
});

describe("user management (admin-only; single-step registration for any role)", () => {
  const newTeacherForm = () =>
    formData({
      name: "New Person",
      identifier: "new-person@test.com",
      password: "testpass123",
      role: "TEACHER",
    });

  it("blocks teachers from listing users", async () => {
    asTeacher();
    await expect(listUsers()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("blocks teachers from creating a user", async () => {
    asTeacher();
    await expect(createUser(newTeacherForm())).rejects.toThrow("REDIRECT:/dashboard");
    expect(await prisma.user.count()).toBe(0);
  });

  it("blocks teachers from deleting a user", async () => {
    const target = await prisma.user.create({
      data: { name: "Target", email: "target@test.com", passwordHash: "x", role: "TEACHER" },
    });
    asTeacher();
    await expect(deleteUser(target.id, "teacher-1")).rejects.toThrow("REDIRECT:/dashboard");
    expect(await prisma.user.findUnique({ where: { id: target.id } })).not.toBeNull();
  });

  it("allows admin to create and then delete a teacher account", async () => {
    asAdmin();
    await createUser(newTeacherForm());
    const created = await prisma.user.findUnique({ where: { email: "new-person@test.com" } });
    expect(created).not.toBeNull();
    expect(created?.passwordHash).not.toBeNull();

    await deleteUser(created!.id, "admin-1");
    expect(await prisma.user.findUnique({ where: { id: created!.id } })).toBeNull();
  });

  it("requires a password of at least 6 characters", async () => {
    asAdmin();
    const fd = formData({
      name: "New Person",
      identifier: "new-person@test.com",
      password: "abc",
      role: "TEACHER",
    });
    await expect(createUser(fd)).rejects.toThrow("Password must be at least 6 characters");
  });

  it("requires an email or phone identifier", async () => {
    asAdmin();
    const fd = formData({ name: "New Person", identifier: "", password: "testpass123", role: "TEACHER" });
    await expect(createUser(fd)).rejects.toThrow("Email or phone number is required");
  });

  it("rejects an identifier that's neither a valid email nor a valid phone", async () => {
    asAdmin();
    const fd = formData({ name: "New Person", identifier: "abc", password: "testpass123", role: "TEACHER" });
    await expect(createUser(fd)).rejects.toThrow("رقم هاتف غير صالح");
  });

  it("prevents an admin from deleting their own account", async () => {
    const self = await prisma.user.create({
      data: { id: "admin-1", name: "Admin", email: "admin@test.com", passwordHash: "x", role: "ADMIN" },
    });
    asAdmin(self.id);
    await expect(deleteUser(self.id, self.id)).rejects.toThrow("You cannot delete your own account");
    expect(await prisma.user.findUnique({ where: { id: self.id } })).not.toBeNull();
  });

  it("creates a STUDENT login and its Student profile in one step, no pre-existing profile needed", async () => {
    asAdmin();
    const fd = formData({
      name: "New Student",
      identifier: "student@test.com",
      password: "testpass123",
      role: "STUDENT",
      grade: "الخامس ابتدائي",
    });
    await createUser(fd);

    const created = await prisma.user.findUnique({ where: { email: "student@test.com" } });
    expect(created?.role).toBe("STUDENT");
    expect(created?.studentId).toBeTruthy();

    const student = await prisma.student.findUnique({ where: { id: created!.studentId! } });
    expect(student?.name).toBe("New Student");
    expect(student?.grade).toBe("الخامس ابتدائي");
  });

  it("requires a grade level when creating a STUDENT", async () => {
    asAdmin();
    const fd = formData({
      name: "New Student",
      identifier: "student@test.com",
      password: "testpass123",
      role: "STUDENT",
    });
    await expect(createUser(fd)).rejects.toThrow("الصف الدراسي مطلوب");
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.student.count()).toBe(0);
  });

  it("does not require a grade level for TEACHER or ADMIN roles", async () => {
    asAdmin();
    await createUser(newTeacherForm());
    expect(await prisma.user.findUnique({ where: { email: "new-person@test.com" } })).not.toBeNull();
  });

  it("creates a STUDENT login with a phone number identifier when no email is given", async () => {
    asAdmin();
    const fd = formData({
      name: "New Student",
      identifier: "+1 555 987 6543",
      password: "testpass123",
      role: "STUDENT",
      grade: "الخامس ابتدائي",
    });
    await createUser(fd);

    const created = await prisma.user.findFirst({ where: { role: "STUDENT" } });
    expect(created?.email).toBeNull();
    expect(created?.phone).toBe("+1 555 987 6543");
    expect(created?.studentId).toBeTruthy();
  });

  it("rejects a phone identifier already used by another login", async () => {
    asAdmin();
    await createUser(
      formData({
        name: "First Login",
        identifier: "+15559876543",
        password: "testpass123",
        role: "STUDENT",
        grade: "الخامس ابتدائي",
      })
    );

    await expect(
      createUser(
        formData({ name: "Second Login", identifier: "1 (555) 987-6543", password: "testpass123", role: "TEACHER" })
      )
    ).rejects.toThrow("يوجد مستخدم بهذا رقم الهاتف مسبقاً");
  });

  it("enrolls a new student in the courses checked during registration", async () => {
    const math = await seedSubject("Mathematics");
    const science = await seedSubject("Science");
    asAdmin();

    const fd = formData({
      name: "New Student",
      identifier: "student@test.com",
      password: "testpass123",
      role: "STUDENT",
      grade: "الخامس ابتدائي",
    });
    fd.append("subjectIds", math.id);
    fd.append("subjectIds", science.id);
    await createUser(fd);

    const created = await prisma.user.findUnique({ where: { email: "student@test.com" } });
    const enrollments = await prisma.studentSubject.findMany({ where: { studentId: created!.studentId! } });
    expect(enrollments.map((e) => e.subjectId).sort()).toEqual([math.id, science.id].sort());
  });

  it("assigns a new teacher to the courses checked during registration", async () => {
    const math = await seedSubject("Mathematics");
    const science = await seedSubject("Science");
    asAdmin();

    const fd = formData({
      name: "New Teacher",
      identifier: "teacher@test.com",
      password: "testpass123",
      role: "TEACHER",
    });
    fd.append("subjectIds", math.id);
    fd.append("subjectIds", science.id);
    await createUser(fd);

    const created = await prisma.user.findUnique({ where: { email: "teacher@test.com" } });
    const assignments = await prisma.teacherSubject.findMany({ where: { teacherId: created!.id } });
    expect(assignments.map((a) => a.subjectId).sort()).toEqual([math.id, science.id].sort());
    expect(created?.studentId).toBeNull();
  });

  it("skips enrollment cleanly when no courses are checked", async () => {
    asAdmin();
    await createUser(
      formData({
        name: "New Student",
        identifier: "student2@test.com",
        password: "testpass123",
        role: "STUDENT",
        grade: "الخامس ابتدائي",
      })
    );

    expect(await prisma.studentSubject.count()).toBe(0);
  });
});

describe("invitations (createInvitation admin-only; completeInvitation is public)", () => {
  it("blocks teachers from creating an invitation", async () => {
    const target = await prisma.user.create({
      data: { name: "Target", email: "target@test.com", role: "TEACHER" },
    });
    asTeacher();
    await expect(createInvitation(target.id)).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("a fresh account has no usable password until the invite is completed", async () => {
    const target = await prisma.user.create({
      data: { name: "Target", email: "target@test.com", role: "TEACHER" },
    });
    asAdmin();
    const { token } = await createInvitation(target.id);
    expect(token).toBeTruthy();
    expect((await prisma.user.findUnique({ where: { id: target.id } }))?.passwordHash).toBeNull();
  });

  it("rejects an unknown or expired token and touches nothing", async () => {
    await expect(completeInvitation("does-not-exist", "newpassword")).rejects.toThrow(
      "رابط الدعوة غير صالح أو منتهي الصلاحية"
    );

    const expired = await prisma.user.create({
      data: {
        name: "Expired",
        email: "expired@test.com",
        role: "TEACHER",
        inviteToken: "expired-token",
        inviteTokenExpiresAt: new Date(Date.now() - 1000),
      },
    });
    await expect(completeInvitation("expired-token", "newpassword")).rejects.toThrow(
      "رابط الدعوة غير صالح أو منتهي الصلاحية"
    );
    expect((await prisma.user.findUnique({ where: { id: expired.id } }))?.passwordHash).toBeNull();
  });

  it("completing an invite sets a working password and clears the token", async () => {
    const target = await prisma.user.create({
      data: { name: "Target", email: "target@test.com", role: "TEACHER" },
    });
    asAdmin();
    const { token } = await createInvitation(target.id);

    const { identifier } = await completeInvitation(token, "newpassword123");
    expect(identifier).toBe("target@test.com");

    const updated = await prisma.user.findUnique({ where: { id: target.id } });
    expect(updated?.passwordHash).toBeTruthy();
    expect(updated?.inviteToken).toBeNull();
    expect(updated?.activatedAt).toBeTruthy();
  });

  it("resetting an active user's password immediately invalidates the old one", async () => {
    asAdmin();
    const target = await prisma.user.create({
      data: { name: "Target", email: "target@test.com", role: "TEACHER" },
    });
    const first = await createInvitation(target.id);
    await completeInvitation(first.token, "firstpassword");
    expect((await prisma.user.findUnique({ where: { id: target.id } }))?.passwordHash).toBeTruthy();

    await createInvitation(target.id);
    expect((await prisma.user.findUnique({ where: { id: target.id } }))?.passwordHash).toBeNull();
  });
});
