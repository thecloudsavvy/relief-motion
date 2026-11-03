import { sendResendAlert } from "@/lib/receptionist/notify";
import { RECEPTIONIST_SYSTEM_PROMPT } from "@/lib/receptionist/prompt";
import { isHandoverContact, whatsappConfig } from "@/lib/receptionist/config";
import { sendWhatsAppText } from "@/lib/receptionist/whatsapp";
import { createAdminClient } from "@/lib/supabase/admin";

type ChatTurn = { role: "user" | "assistant"; content: string };

type WaConversation = {
  id: string;
  wa_id: string;
  profile_name: string | null;
  location: string | null;
  service: string | null;
  preferred_date: string | null;
  notes: string | null;
  status: string;
};

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "save_lead",
      description: "Save name, location, service type or preferred day learned from the patient.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          location: { type: "string" },
          service: { type: "string" },
          preferred_date: { type: "string" },
          notes: { type: "string" }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "request_handover",
      description: "Hand this chat to a human. Use for a person request, clinical or custom/stroke, booking confirm, anger, or uncertainty.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string" },
          summary: { type: "string" }
        },
        required: ["reason"]
      }
    }
  }
];

function tighten(text: string) {
  const cleaned = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned) return "";
  const lines = cleaned.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length > 2) return lines.slice(0, 2).join("\n");
  if (cleaned.length <= 320) return cleaned;
  const sentences = cleaned.split(/(?<=[.!?])\s+/).slice(0, 2);
  return sentences.join(" ").slice(0, 320).trim();
}

function toolArgs(raw: string) {
  try {
    return JSON.parse(raw || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

async function openaiChat(messages: unknown[], tools = true) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { error: "missing_key" as const };
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 160,
      messages,
      ...(tools ? { tools: TOOLS, tool_choice: "auto" } : {})
    })
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{
          id: string;
          function: { name: string; arguments: string };
        }>;
      };
    }>;
  };
  if (!response.ok) return { error: payload.error?.message || "openai_error" as const };
  return { message: payload.choices?.[0]?.message || {} };
}

export async function handleIncoming(input: { waId: string; name: string; text: string; wamid: string }) {
  if (isHandoverContact(input.waId)) return;

  const admin = createAdminClient();
  if (!admin) return;

  if (input.wamid) {
    const { data: seen } = await admin.from("wa_messages").select("id").eq("wamid", input.wamid).maybeSingle();
    if (seen) return;
  }

  const { data: existing } = await admin.from("wa_conversations").select("*").eq("wa_id", input.waId).maybeSingle();
  let conversation = existing as WaConversation | null;
  if (!conversation) {
    const inserted = await admin
      .from("wa_conversations")
      .insert({
        wa_id: input.waId,
        profile_name: input.name || null
      })
      .select("*")
      .single();
    conversation = (inserted.data as WaConversation | null) || null;
  } else if (input.name && !conversation.profile_name) {
    await admin.from("wa_conversations").update({ profile_name: input.name }).eq("id", conversation.id);
  }
  if (!conversation) return;

  const inboundText =
    input.text ||
    "The patient sent a voice note, photo or other message that is not text. Ask them to type a short message.";

  await admin.from("wa_messages").insert({
    conversation_id: conversation.id,
    wamid: input.wamid || null,
    direction: "in",
    body: inboundText
  });
  await admin
    .from("wa_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);

  if (conversation.status === "handed_over" || conversation.status === "closed") return;

  const { data: history } = await admin
    .from("wa_messages")
    .select("direction, body")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(24);

  const turns: ChatTurn[] = (history || [])
    .filter((row) => row.body)
    .map((row) => ({
      role: row.direction === "out" ? "assistant" : "user",
      content: row.body as string
    }));

  const messages: unknown[] = [
    { role: "system", content: RECEPTIONIST_SYSTEM_PROMPT },
    ...turns
  ];

  let reply = "";
  let handedOver = false;
  const first = await openaiChat(messages);
  if ("error" in first && first.error === "missing_key") {
    reply = "Sorry, our chat line is not fully set up yet. Please call 0812 730 7919 and we will help you.";
  } else if ("error" in first) {
    reply = "Sorry, I missed that. Please send it again, or call 0812 730 7919.";
  } else {
    const toolCalls = first.message.tool_calls || [];
    for (const call of toolCalls) {
      const args = toolArgs(call.function.arguments);
      if (call.function.name === "save_lead") {
        await admin
          .from("wa_conversations")
          .update({
            profile_name: args.name || conversation.profile_name,
            location: args.location || conversation.location,
            service: args.service || conversation.service,
            preferred_date: args.preferred_date || conversation.preferred_date,
            notes: args.notes || conversation.notes,
            updated_at: new Date().toISOString()
          })
          .eq("id", conversation.id);
      }
      if (call.function.name === "request_handover" && !handedOver) {
        handedOver = true;
        await handOverChat({
          conversationId: conversation.id,
          waId: input.waId,
          name: args.name || conversation.profile_name || input.name || "Patient",
          location: args.location || conversation.location || "",
          reason: args.reason || "Handover requested",
          summary: args.summary || inboundText,
          history: turns
        });
      }
    }

    reply = tighten(first.message.content || "");
    if (toolCalls.length && !reply) {
      const follow = await openaiChat(
        [
          ...messages,
          first.message,
          ...toolCalls.map((call) => ({
            role: "tool",
            tool_call_id: call.id,
            content: call.function.name === "request_handover" ? "Handover notified." : "Lead saved."
          }))
        ],
        false
      );
      if (!("error" in follow)) reply = tighten(follow.message.content || "");
    }
  }

  if (!reply && handedOver) {
    reply = "I'm connecting you with our team now. Someone will continue with you shortly.";
  }
  if (!reply) {
    reply = "Sorry, please type that again in one short message.";
  }

  const sent = await sendWhatsAppText(input.waId, reply);
  if (sent.ok) {
    await admin.from("wa_messages").insert({
      conversation_id: conversation.id,
      direction: "out",
      body: reply
    });
  }
}

async function handOverChat(input: {
  conversationId: string;
  waId: string;
  name: string;
  location: string;
  reason: string;
  summary: string;
  history: ChatTurn[];
}) {
  const admin = createAdminClient();
  if (!admin) return;
  await admin
    .from("wa_conversations")
    .update({
      status: "handed_over",
      handed_over_at: new Date().toISOString(),
      handover_reason: input.reason,
      updated_at: new Date().toISOString()
    })
    .eq("id", input.conversationId);

  const recent = input.history
    .slice(-8)
    .map((turn) => `${turn.role === "user" ? "Patient" : "Relief Motion"}: ${turn.content}`)
    .join("\n");
  const alert = [
    "WhatsApp handover",
    `Patient: ${input.name}`,
    `Number: +${input.waId}`,
    input.location ? `Area: ${input.location}` : "",
    `Why: ${input.reason}`,
    input.summary ? `Note: ${input.summary}` : "",
    "",
    recent
  ]
    .filter((line) => line !== "")
    .join("\n");

  const { handoverWaId } = whatsappConfig();
  await sendWhatsAppText(handoverWaId, alert.slice(0, 3500));
  await sendResendAlert("WhatsApp handover: " + input.name, alert.replace(/\n/g, "<br>"));
}
