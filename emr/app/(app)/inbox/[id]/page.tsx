import Link from "next/link";
import { notFound } from "next/navigation";
import { reopenWhatsAppChat } from "@/app/(app)/inbox/actions";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export default async function InboxThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: chat } = await supabase.from("wa_conversations").select("*").eq("id", id).maybeSingle();
  if (!chat) notFound();
  const { data: messages } = await supabase
    .from("wa_messages")
    .select("id, direction, body, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return (
    <>
      <div className="page-head">
        <div>
          <p className="muted">
            <Link href="/inbox">WhatsApp inbox</Link>
          </p>
          <h1>{chat.profile_name || "Unknown"}</h1>
          <p className="muted">
            +{chat.wa_id}
            {chat.location ? ` · ${chat.location}` : ""}
            {chat.service ? ` · ${chat.service}` : ""}
          </p>
        </div>
      </div>
      <section className="panel">
        {(messages || []).map((row) => (
          <p key={row.id} style={{ marginBottom: "0.85rem" }}>
            <strong>{row.direction === "out" ? "Relief Motion" : "Patient"}</strong>
            <span className="muted"> · {formatDateTime(row.created_at)}</span>
            <br />
            {row.body}
          </p>
        ))}
        {!messages?.length ? <p className="muted">No messages stored.</p> : null}
        {chat.status === "handed_over" ? (
          <form action={reopenWhatsAppChat}>
            <input type="hidden" name="id" value={chat.id} />
            <button className="btn" type="submit">
              Let bot reply again
            </button>
          </form>
        ) : null}
      </section>
    </>
  );
}
