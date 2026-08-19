import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "TEACHER" | "STUDENT";
      studentId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "TEACHER" | "STUDENT";
    studentId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "TEACHER" | "STUDENT";
    studentId?: string | null;
  }
}
