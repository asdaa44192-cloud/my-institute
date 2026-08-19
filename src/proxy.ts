import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ADMIN_ONLY_PREFIXES = ["/payments", "/settings", "/subjects"];
const STUDENT_BLOCKED_PREFIXES = ["/students", "/attendance", "/grades", "/payments", "/settings", "/subjects"];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    const isAdminOnly = ADMIN_ONLY_PREFIXES.some((p) => path.startsWith(p));
    if (isAdminOnly && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    const isStudentBlocked = STUDENT_BLOCKED_PREFIXES.some((p) => path.startsWith(p));
    if (isStudentBlocked && token?.role === "STUDENT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/students/:path*",
    "/attendance/:path*",
    "/grades/:path*",
    "/payments/:path*",
    "/settings/:path*",
    "/subjects/:path*",
  ],
};
