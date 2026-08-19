import { describe, expect, it } from "vitest";
import { cn, formatCurrency, formatDate, formatDateInput } from "./utils";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, "b", undefined, "c")).toBe("a b c");
  });
});

describe("formatCurrency", () => {
  it("formats as USD with two decimal places", () => {
    expect(formatCurrency(1200)).toBe("$1,200.00");
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(99.5)).toBe("$99.50");
  });
});

describe("formatDate", () => {
  it("formats a Date and an ISO string the same way", () => {
    const d = new Date(2026, 7, 19);
    expect(formatDate(d)).toBe(formatDate(d.toISOString()));
  });
});

describe("formatDateInput", () => {
  it("returns a YYYY-MM-DD string", () => {
    const d = new Date(Date.UTC(2026, 7, 19));
    expect(formatDateInput(d)).toBe("2026-08-19");
  });
});
