import { createHmac, timingSafeEqual } from "crypto";
import { graphVersion, whatsappConfig } from "@/lib/receptionist/config";

export function verifyWhatsAppSignature(rawBody: string, header: string | null) {
  const { appSecret } = whatsappConfig();
  if (!appSecret) return false;
  const incoming = (header || "").trim();
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const left = Buffer.from(incoming);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function sendWhatsAppText(to: string, body: string) {
  const { token, phoneNumberId } = whatsappConfig();
  if (!token || !phoneNumberId) {
    return { ok: false as const, error: "WhatsApp API keys are not set" };
  }
  const response = await fetch(
    `https://graph.facebook.com/${graphVersion()}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body }
      })
    }
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    return { ok: false as const, error: payload?.error?.message || `WhatsApp ${response.status}` };
  }
  return { ok: true as const };
}

type WhatsAppChange = {
  value?: {
    messages?: Array<{
      id?: string;
      from?: string;
      type?: string;
      text?: { body?: string };
      button?: { text?: string; payload?: string };
      interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
      location?: { latitude?: number; longitude?: number; name?: string; address?: string };
    }>;
    contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
    statuses?: unknown[];
  };
};

export function incomingWhatsAppMessages(body: unknown) {
  const root = body && typeof body === "object" ? (body as { entry?: Array<{ changes?: WhatsAppChange[] }> }) : {};
  const out: { waId: string; name: string; text: string; wamid: string }[] = [];
  for (const entry of root.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value?.messages?.length) continue;
      const nameById = new Map<string, string>();
      for (const contact of value.contacts || []) {
        if (contact.wa_id) nameById.set(contact.wa_id, contact.profile?.name || "");
      }
      for (const message of value.messages) {
        const waId = message.from || "";
        if (!waId) continue;
        let text = "";
        if (message.type === "text") text = message.text?.body || "";
        else if (message.type === "button") text = message.button?.text || message.button?.payload || "";
        else if (message.type === "interactive") {
          text = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || "";
        } else if (message.type === "location") {
          const loc = message.location;
          text = [loc?.name, loc?.address, loc?.latitude && loc?.longitude ? `${loc.latitude},${loc.longitude}` : ""]
            .filter(Boolean)
            .join(" ");
        } else {
          text = "";
        }
        out.push({
          waId,
          name: nameById.get(waId) || "",
          text: text.trim(),
          wamid: message.id || ""
        });
      }
    }
  }
  return out;
}
