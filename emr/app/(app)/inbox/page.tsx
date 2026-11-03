import Link from "next/link";
import { reopenWhatsAppChat } from "@/app/(app)/inbox/actions";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

type Conversation = {
  id: string;
  wa_id: string;
  profile_name: string | null;
  location: string | null;
  service: string | null;
  preferred_date: string | null;
  status: string;
  handover_reason: string | null;
  updated_at: string;
};

export default async function InboxPage() {
  const { supabase } = await requireAdmin();
  const { data: rows, error } = await supabase
    .from("wa_conversations")
    .select("id, wa_id, profile_name, location, service, preferred_date, status, handover_reason, updated_at")
    .order("updated_at", { ascending: false })
    .limit(80);

  if (error) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>WhatsApp inbox</h1>
            <p className="muted">The WhatsApp tables are not in the database yet. Run emr/supabase/schema.sql in the Supabase SQL editor, then refresh.</p>
          </div>
        </div>
      </>
    );
  }

  const conversations = (rows || []) as Conversation[];
  const ids = conversations.map((row) => row.id);
  const { data: messages } = ids.length
    ? await supabase
        .from("wa_messages")
        .select("conversation_id, direction, body, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(400)
    : { data: [] };

  const lastByChat = new Map<string, { body: string; created_at: string }>();
  for (const row of messages || []) {
    if (!lastByChat.has(row.conversation_id)) {
      lastByChat.set(row.conversation_id, { body: row.body || "", created_at: row.created_at });
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>WhatsApp inbox</h1>
          <p className="muted">
            Test number 0907 051 6317. The bot replies until a chat is handed to 0812 730 7919. Patient bookings on
            0916 494 4357 are unchanged.
          </p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Area</th>
              <th>Last message</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {conversations.length ? (
              conversations.map((row) => {
                const last = lastByChat.get(row.id);
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.profile_name || "Unknown"}</strong>
                      <div className="muted">+{row.wa_id}</div>
                    </td>
                    <td>
                      {row.location || "—"}
                      {row.service ? <div className="muted">{row.service}</div> : null}
                      {row.preferred_date ? <div className="muted">{row.preferred_date}</div> : null}
                    </td>
                    <td>
                      <div>{last?.body || "—"}</div>
                      <div className="muted">{last?.created_at ? formatDateTime(last.created_at) : formatDateTime(row.updated_at)}</div>
                    </td>
                    <td>{row.status === "handed_over" ? "Handed over" : row.status === "closed" ? "Closed" : "Bot"}</td>
                    <td>
                      <Link className="text-link" href={`/inbox/${row.id}`}>
                        Open
                      </Link>
                      {row.status === "handed_over" ? (
                        <form action={reopenWhatsAppChat}>
                          <input type="hidden" name="id" value={row.id} />
                          <button className="text-link" type="submit">
                            Let bot reply again
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="muted">
                  No WhatsApp chats yet. Message the test number after Cloud API is connected.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
