import { describe, expect, it } from "vitest";
import {
  whatsappLink,
  paymentReminderMessage,
  attendanceAlertMessage,
  receiptMessage,
} from "./whatsapp";

describe("whatsappLink", () => {
  it("strips non-digit characters from the phone number", () => {
    const link = whatsappLink("+1 (555) 000-1111", "hi");
    expect(link).toBe("https://wa.me/15550001111?text=hi");
  });

  it("URL-encodes the message", () => {
    const link = whatsappLink("15550001111", "Hello & welcome!");
    expect(link).toContain(encodeURIComponent("Hello & welcome!"));
    expect(link).not.toContain(" ");
  });

  it("replaces a leading trunk 0 with the 964 Iraq country code", () => {
    const link = whatsappLink("07701234567", "hi");
    expect(link).toBe("https://wa.me/9647701234567?text=hi");
  });

  it("leaves numbers that already include a country code untouched", () => {
    const link = whatsappLink("+964 770 123 4567", "hi");
    expect(link).toBe("https://wa.me/9647701234567?text=hi");
  });
});

describe("paymentReminderMessage", () => {
  it("includes the student name, grade, and formatted remaining balance", () => {
    const msg = paymentReminderMessage({ studentName: "Amina Yusuf", grade: "Grade 5", remaining: 500 });
    expect(msg).toContain("Amina Yusuf");
    expect(msg).toContain("Grade 5");
    expect(msg).toContain("$500.00");
  });
});

describe("attendanceAlertMessage", () => {
  it.each([
    ["PRESENT", "كان حاضراً"],
    ["LATE", "وصل متأخراً"],
    ["ABSENT", "كان غائباً"],
  ] as const)("renders correct phrasing for %s", (status, phrase) => {
    const msg = attendanceAlertMessage({
      studentName: "Omar Farouk",
      date: "Aug 19, 2026",
      status,
      subject: "Mathematics",
    });
    expect(msg).toContain(phrase);
    expect(msg).toContain("Mathematics");
  });
});

describe("receiptMessage", () => {
  it("includes amount and remaining balance formatted as currency", () => {
    const msg = receiptMessage({ studentName: "Sara Ahmed", amount: 300, date: "Aug 19, 2026", remaining: 150 });
    expect(msg).toContain("$300.00");
    expect(msg).toContain("$150.00");
  });
});
