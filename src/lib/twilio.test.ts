import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("twilio", () => ({
  default: vi.fn(() => ({ messages: { create: createMock } })),
}));

import { sendWhatsAppMessage } from "@/lib/twilio";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  createMock.mockReset();
  process.env.TWILIO_ACCOUNT_SID = "";
  process.env.TWILIO_AUTH_TOKEN = "";
  process.env.TWILIO_WHATSAPP_NUMBER = "";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("sendWhatsAppMessage", () => {
  it("never throws and reports not_configured when Twilio env vars are missing", async () => {
    const result = await sendWhatsAppMessage("+15550001111", "hello");
    expect(result).toEqual({ ok: false, reason: "not_configured" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("never throws and reports the error when the Twilio client rejects", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "token_test";
    process.env.TWILIO_WHATSAPP_NUMBER = "+15005550006";
    createMock.mockRejectedValue(new Error("Twilio: invalid number"));

    const result = await sendWhatsAppMessage("+15550001111", "hello");
    expect(result).toEqual({ ok: false, reason: "Twilio: invalid number" });
  });

  it("sends successfully when configured, normalizing the destination number", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "token_test";
    process.env.TWILIO_WHATSAPP_NUMBER = "+15005550006";
    createMock.mockResolvedValue({ sid: "SM123" });

    const result = await sendWhatsAppMessage("+1 (555) 000-1111", "hello");
    expect(result).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledWith({
      from: "whatsapp:+15005550006",
      to: "whatsapp:+15550001111",
      body: "hello",
    });
  });
});
