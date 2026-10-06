import { createClient } from "@/lib/supabase/server";

export async function writeAudit(input: {
  action: string;
  patientId?: string | null;
  visitId?: string | null;
  detail?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("audit_events").insert({
    actor_id: user.id,
    action: input.action,
    patient_id: input.patientId || null,
    visit_id: input.visitId || null,
    detail: input.detail || null
  });
}
