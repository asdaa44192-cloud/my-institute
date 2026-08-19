# Institute Manager

Educational Institute Management System — student & financial records, attendance,
grades, WhatsApp parent communication, and role-based access control (Admin / Staff).

## Stack

| Layer      | Choice                                                                 |
| ---------- | ----------------------------------------------------------------------|
| Framework  | Next.js 16 (App Router, Server Components, Server Actions)            |
| Styling    | Tailwind CSS v4                                                       |
| Database   | SQLite via Prisma 7 (`@prisma/adapter-libsql`) — swap-in Postgres/Supabase later |
| Auth       | NextAuth v4 (Credentials provider, JWT sessions)                      |
| Charts     | Recharts                                                               |
| PDF        | jsPDF (client-side receipt export)                                    |

## Getting started

```bash
npm install
npx prisma migrate dev   # creates dev.db and applies the schema
npm run db:seed          # seeds demo Admin/Staff users + sample students
npm run dev              # http://localhost:3000
```

The master admin account is bootstrapped automatically — both by `npm run db:seed` and on
every server startup (`src/instrumentation.ts`), so it exists even if the seed script is
never run in production. It's only ever *created*, never overwritten, and its credentials
come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` (see `.env` for the defaults) — they're
intentionally not printed here since this file may end up committed or shared.

Demo accounts (from the seed script, not shown on the login page in production):

| Role    | Email                  | Password    |
| ------- | ----------------------- | ----------- |
| Teacher | staff@institute.test    | staff123    |
| Student | amina@institute.test    | student123  |

## Project structure

```
prisma/
  schema.prisma          Student, Payment, AttendanceRecord, GradeRecord, User models
  seed.ts                 Demo data
src/
  app/
    login/                 Sign-in page
    (app)/                 Authenticated routes, wrapped in the sidebar shell
      dashboard/           Metrics, enrollment chart, overdue alerts (admin)
      students/            List, profile, create/edit, receipts
      payments/            Admin-only payment ledger
      attendance/          Daily attendance grid per grade/subject
      grades/              Exam scores + subject averages chart
      settings/            Admin-only user management (RBAC)
    api/auth/[...nextauth]/ NextAuth route handler
  components/              UI primitives + feature components
  lib/
    actions/               Server Actions (data access + mutations, role-checked)
    auth.ts, session.ts    NextAuth config + requireUser()/requireAdmin() guards
    whatsapp.ts             wa.me link + message builders
  proxy.ts                 Route protection (Next.js 16 middleware convention)
```

## Role-based access control

- `requireUser()` / `requireAdmin()` (`src/lib/session.ts`) guard every Server Action
  and admin-only page server-side — this is the real enforcement boundary.
- `src/proxy.ts` additionally redirects unauthenticated visitors to `/login` and
  redirects Staff away from `/payments` and `/settings`.
- UI (nav links, page sections, table columns) is conditionally rendered per role so
  Staff never sees financial data, but the data is also withheld/blocked server-side.

## WhatsApp integration

`src/lib/whatsapp.ts` builds `wa.me/<phone>?text=<encoded message>` links — no API
keys or WhatsApp Business account required. Buttons appear on the dashboard (overdue
reminders), student profile (payment reminders, receipt confirmations), and the
attendance grid (absence/late alerts).

## Payment receipts

Each payment has a `/students/[id]/receipt/[paymentId]` page (admin-only) with:
- **Print** — browser print dialog (styled for print via `@media print`)
- **Download PDF** — generates a receipt PDF client-side with jsPDF

## Useful scripts

```bash
npm run db:studio   # Prisma Studio — browse/edit data visually
npm run db:migrate  # create a new migration after editing schema.prisma
npm run build        # production build
```

## Moving to Postgres/Supabase later

Swap the adapter in `src/lib/prisma.ts` and `prisma/seed.ts` from
`@prisma/adapter-libsql` to `@prisma/adapter-pg` (or Supabase's driver), change the
`datasource` provider in `schema.prisma` to `postgresql`, point `DATABASE_URL` at your
Supabase connection string, and re-run `npx prisma migrate dev`.
