import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import path from "path";

const adapter = new PrismaLibSql({ url: `file:${path.join(process.cwd(), "dev.db")}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set to run the seed script");
  }
  const adminEmail = process.env.ADMIN_EMAIL.toLowerCase();
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  const staffPassword = await bcrypt.hash("staff123", 10);
  const studentPassword = await bcrypt.hash("student123", 10);

  // Only ever created if missing — never overwrites an existing admin's password.
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Admin",
      email: adminEmail,
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: "staff@institute.test" },
    update: {},
    create: {
      name: "Staff Teacher",
      email: "staff@institute.test",
      passwordHash: staffPassword,
      role: "TEACHER",
    },
  });

  const subjectNames = ["الرياضيات", "العلوم"];
  const subjects = new Map<string, { id: string }>();
  for (const name of subjectNames) {
    const subject = await prisma.subject.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    subjects.set(name, subject);
  }

  await prisma.teacherSubject.upsert({
    where: { teacherId_subjectId: { teacherId: teacher.id, subjectId: subjects.get("الرياضيات")!.id } },
    update: {},
    create: { teacherId: teacher.id, subjectId: subjects.get("الرياضيات")!.id },
  });

  const sampleStudents = [
    {
      name: "Amina Yusuf",
      grade: "الخامس ابتدائي",
      studentPhone: "+15550001111",
      parentPhone: "+15550002222",
      totalFee: 1200,
      paid: [400, 300],
      subject: "الرياضيات",
      loginEmail: "amina@institute.test",
    },
    {
      name: "Omar Farouk",
      grade: "الخامس ابتدائي",
      studentPhone: "+15550003333",
      parentPhone: "+15550004444",
      totalFee: 1200,
      paid: [1200],
      subject: "الرياضيات",
    },
    {
      name: "Layla Hassan",
      grade: "الثاني متوسط",
      studentPhone: "+15550005555",
      parentPhone: "+15550006666",
      totalFee: 1500,
      paid: [200],
      subject: "الرياضيات",
    },
    {
      name: "Yusuf Ibrahim",
      grade: "الثاني متوسط",
      studentPhone: "+15550007777",
      parentPhone: "+15550008888",
      totalFee: 1500,
      paid: [],
      subject: "العلوم",
    },
    {
      name: "Sara Ahmed",
      grade: "الرابع إعدادي",
      studentPhone: "+15550009999",
      parentPhone: "+15550010101",
      totalFee: 1800,
      paid: [900, 450],
      subject: "العلوم",
    },
    {
      name: "Zainab Karim",
      grade: "الأول ابتدائي",
      studentPhone: "+15550011111",
      parentPhone: "+15550012222",
      totalFee: 1000,
      paid: [500],
      subject: "الرياضيات",
    },
    {
      name: "Hassan Ali",
      grade: "الثاني ابتدائي",
      studentPhone: "+15550013333",
      parentPhone: "+15550014444",
      totalFee: 1000,
      paid: [],
      subject: "العلوم",
    },
    {
      name: "Noor Salim",
      grade: "الثالث ابتدائي",
      studentPhone: "+15550015555",
      parentPhone: "+15550016666",
      totalFee: 1100,
      paid: [1100],
      subject: "الرياضيات",
    },
    {
      name: "Karim Tariq",
      grade: "الرابع ابتدائي",
      studentPhone: "+15550017777",
      parentPhone: "+15550018888",
      totalFee: 1100,
      paid: [300],
      subject: "العلوم",
    },
    {
      name: "Rana Fadel",
      grade: "السادس ابتدائي",
      studentPhone: "+15550019999",
      parentPhone: "+15550020202",
      totalFee: 1300,
      paid: [650, 650],
      subject: "الرياضيات",
    },
    {
      name: "Ali Naji",
      grade: "الأول متوسط",
      studentPhone: "+15550021111",
      parentPhone: "+15550022222",
      totalFee: 1400,
      paid: [],
      subject: "العلوم",
    },
    {
      name: "Huda Salman",
      grade: "الثالث متوسط",
      studentPhone: "+15550023333",
      parentPhone: "+15550024444",
      totalFee: 1600,
      paid: [800],
      subject: "الرياضيات",
    },
    {
      name: "Mahmoud Adel",
      grade: "الخامس إعدادي",
      studentPhone: "+15550025555",
      parentPhone: "+15550026666",
      totalFee: 1800,
      paid: [1800],
      subject: "العلوم",
    },
    {
      name: "Dalia Younis",
      grade: "السادس إعدادي",
      studentPhone: "+15550027777",
      parentPhone: "+15550028888",
      totalFee: 2000,
      paid: [1000],
      subject: "الرياضيات",
    },
  ];

  for (const s of sampleStudents) {
    let student = await prisma.student.findFirst({ where: { name: s.name } });
    if (student) {
      student = await prisma.student.update({
        where: { id: student.id },
        data: {
          grade: s.grade,
          studentPhone: s.studentPhone,
          parentPhone: s.parentPhone,
          totalFee: s.totalFee,
        },
      });
    } else {
      student = await prisma.student.create({
        data: {
          name: s.name,
          grade: s.grade,
          studentPhone: s.studentPhone,
          parentPhone: s.parentPhone,
          totalFee: s.totalFee,
        },
      });

      for (const [i, amount] of s.paid.entries()) {
        await prisma.payment.create({
          data: {
            studentId: student.id,
            amount,
            date: new Date(Date.now() - (s.paid.length - i) * 20 * 24 * 60 * 60 * 1000),
            method: "cash",
          },
        });
      }

      const subjectId = subjects.get(s.subject)!.id;

      await prisma.attendanceRecord.create({
        data: {
          studentId: student.id,
          date: new Date(),
          subjectId,
          status: "PRESENT",
          recordedById: teacher.id,
        },
      });

      await prisma.gradeRecord.create({
        data: {
          studentId: student.id,
          subjectId,
          examName: "Midterm",
          score: 70 + Math.round(Math.random() * 25),
          maxScore: 100,
          recordedById: teacher.id,
        },
      });
    }

    const subjectId = subjects.get(s.subject)!.id;
    await prisma.studentSubject.upsert({
      where: { studentId_subjectId: { studentId: student.id, subjectId } },
      update: {},
      create: { studentId: student.id, subjectId },
    });

    if (s.loginEmail) {
      await prisma.user.upsert({
        where: { email: s.loginEmail },
        update: { phone: s.parentPhone },
        create: {
          name: s.name,
          email: s.loginEmail,
          passwordHash: studentPassword,
          role: "STUDENT",
          studentId: student.id,
          phone: s.parentPhone,
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log(`Admin login: ${admin.email} / (from ADMIN_PASSWORD)`);
  console.log(`Teacher login: staff@institute.test / staff123`);
  console.log(`Student login: amina@institute.test / student123`);
  console.log(`(users: ${admin.email}, ${teacher.email})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
