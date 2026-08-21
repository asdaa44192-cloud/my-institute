import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateInput(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function daysOverdue(lastPaymentOrEnroll: Date) {
  const ms = Date.now() - new Date(lastPaymentOrEnroll).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function normalizePhoneDigits(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

const RAW_DB_ERROR_PATTERN = /prisma|constraint failed|invocation:|\bsqlite/i;

/**
 * Defense-in-depth for client-facing error boundaries (error.tsx). Next.js
 * already redacts most Server Component errors to a generic message in
 * production, and the actions that can hit a raw Prisma constraint error
 * already catch and translate it — this is a last-resort check in case some
 * other, unanticipated path lets one through, so a raw "Unique constraint
 * failed on the fields: (`email`)"-style message never reaches the client.
 * Deliberately dependency-free (no Prisma import) since error.tsx is a
 * Client Component.
 */
export function redactIfLooksLikeDatabaseError(message: string) {
  return RAW_DB_ERROR_PATTERN.test(message)
    ? "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى أو التواصل مع الدعم الفني."
    : message;
}

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";

/** Generates a random password using the Web Crypto API (available in both the browser and Node). */
export function generateRandomPassword(length = 12) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("");
}
