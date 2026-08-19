import twilio from "twilio";

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  return sid && authToken ? twilio(sid, authToken) : null;
}

export type WhatsAppSendResult = { ok: true } | { ok: false; reason: string };

/**
 * Sends a WhatsApp message via Twilio. Never throws — callers (account
 * creation, invite resends) must succeed regardless of delivery failures.
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<WhatsAppSendResult> {
  const twilioClient = getClient();
  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!twilioClient || !from) {
    console.warn("Twilio is not configured; skipping WhatsApp send.");
    return { ok: false, reason: "not_configured" };
  }

  const digits = to.replace(/[^\d]/g, "");
  if (!digits) {
    return { ok: false, reason: "invalid_phone" };
  }

  try {
    await twilioClient.messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:+${digits}`,
      body,
    });
    return { ok: true };
  } catch (error) {
    console.error("Failed to send WhatsApp message via Twilio:", error);
    return { ok: false, reason: error instanceof Error ? error.message : "unknown_error" };
  }
}
