import { after } from "next/server";
import { NextResponse } from "next/server";
import { digits, whatsappConfig } from "@/lib/receptionist/config";
import { handleIncoming } from "@/lib/receptionist/engine";
import { incomingWhatsAppMessages, verifyWhatsAppSignature } from "@/lib/receptionist/whatsapp";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = whatsappConfig().verifyToken;
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  const { appSecret } = whatsappConfig();
  if (!appSecret) {
    return NextResponse.json({ error: "WhatsApp is not configured" }, { status: 503 });
  }
  if (!verifyWhatsAppSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = incomingWhatsAppMessages(payload);
  after(async () => {
    for (const message of messages) {
      await handleIncoming({
        waId: digits(message.waId),
        name: message.name,
        text: message.text,
        wamid: message.wamid
      });
    }
  });

  return NextResponse.json({ ok: true });
}
