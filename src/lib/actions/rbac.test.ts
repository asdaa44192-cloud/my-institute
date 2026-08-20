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
import { createStudent, updateStudent, deactivateStudent, getStudents, getStudentById } from "@/lib/actions/students";
import { addPayment, deletePayment, getAllPayments } from "@/lib/actions/payments";
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

describe("user management (admin-only)", () => {
  const newTeacherForm = () =>
    formData({
      name: "New Person",
      email: "new-person@test.com",
      password: "testpass123",
      phone: "+15550000000",
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
      email: "new-person@test.com",
      password: "abc",
      phone: "+15550000000",
      role: "TEACHER",
    });
    await expect(createUser(fd)).rejects.toThrow("Password must be at least 6 characters");
  });

  it("requires a phone number for a non-student account", async () => {
    asAdmin();
    const fd = formData({
      name: "New Person",
      email: "new-person@test.com",
      password: "testpass123",
      role: "TEACHER",
    });
    await expect(createUser(fd)).rejects.toThrow("Phone number is required");
  });

  it("prevents an admin from deleting their own account", async () => {
    const self = await prisma.user.create({
      data: { id: "admin-1", name: "Admin", email: "admin@test.com", passwordHash: "x", role: "ADMIN" },
    });
    asAdmin(self.id);
    await expect(deleteUser(self.id, self.id)).rejects.toThrow("You cannot delete your own account");
    expect(await prisma.user.findUnique({ where: { id: self.id } })).not.toBeNull();
  });

  it("requires a linked student when creating a STUDENT login", async () => {
    asAdmin();
    const fd = formData({
      name: "Student Login",
      email: "student@test.com",
      password: "testpass123",
      role: "STUDENT",
    });
    await expect(createUser(fd)).rejects.toThrow("Select which student this login belongs to");
  });

  it("creates a STUDENT login linked to an existing student", async () => {
    const student = await seedStudent();
    asAdmin();
    const fd = formData({
      name: "Student Login",
      email: "student@test.com",
      password: "testpass123",
      role: "STUDENT",
      studentId: student.id,
    });
    await createUser(fd);
    const created = await prisma.user.findUnique({ where: { email: "student@test.com" } });
    expect(created?.studentId).toBe(student.id);
    expect(created?.phone).toBe(student.parentPhone);
    expect(created?.passwordHash).not.toBeNull();
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

    const { email } = await completeInvitation(token, "newpassword123");
    expect(email).toBe("target@test.com");

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
