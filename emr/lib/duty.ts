import { lagosDayStartIso, lagosStamp } from "@/lib/format";
import type { createClient } from "@/lib/supabase/server";

type StaffDb = Awaited<ReturnType<typeof createClient>>;

export async function physioDutyIds(supabase: StaffDb) {
  const today = lagosStamp().visit_at;
  const start = lagosDayStartIso();
  const enabled = await supabase
    .from("profiles")
    .select("id, last_seen_at")
    .eq("role", "physiotherapist")
    .neq("status", "disabled");
  const rows =
    enabled.error && /last_seen_at/.test(enabled.error.message)
      ? (
          await supabase
            .from("profiles")
            .select("id")
            .eq("role", "physiotherapist")
            .neq("status", "disabled")
        ).data || []
      : enabled.data || [];

  const allowed = new Set(rows.map((row) => row.id));
  const duty = new Set<string>();

  for (const row of rows) {
    if ("last_seen_at" in row && row.last_seen_at && String(row.last_seen_at) >= start) duty.add(row.id);
  }

  const [{ data: visits }, { data: audits }] = await Promise.all([
    supabase.from("visits").select("clinician_id").eq("visit_at", today),
    supabase.from("audit_events").select("actor_id").gte("created_at", start)
  ]);

  for (const row of visits || []) {
    if (row.clinician_id && allowed.has(row.clinician_id)) duty.add(row.clinician_id);
  }
  for (const row of audits || []) {
    if (row.actor_id && allowed.has(row.actor_id)) duty.add(row.actor_id);
  }

  return Array.from(duty);
}
