export const TEST_WA_NUMBER = "2349070516317";
export const HANDOVER_WA_ID = "2348127307919";
export const LIVE_PATIENT_WA_ID = "2349164944357";

export function digits(value: string) {
  const raw = value.replace(/\D/g, "");
  if (raw.startsWith("0") && raw.length === 11) return `234${raw.slice(1)}`;
  if (raw.startsWith("234")) return raw;
  return raw;
}

export function isHandoverContact(waId: string) {
  return digits(waId) === HANDOVER_WA_ID;
}

export function graphVersion() {
  return process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v22.0";
}

export function whatsappConfig() {
  return {
    token: process.env.WHATSAPP_TOKEN?.trim() || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() || "",
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim() || "",
    handoverWaId: digits(process.env.WHATSAPP_HANDOVER || HANDOVER_WA_ID)
  };
}
