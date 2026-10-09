import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateVisit } from "@/app/actions";
import { SessionForm, SessionRails } from "@/components/SessionForm";
import { requirePatientAccess } from "@/lib/auth";
import { auditCopy, formatDateTime } from "@/lib/format";
import type { Profile, Visit } from "@/lib/types";

export default async function EditSessionPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string; visitId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, visitId } = await params;
  const { error } = await searchParams;
  const { supabase, user } = await requirePatientAccess(id);
  const { data: visit } = await supabase.from("visits").select("*").eq("id", visitId).eq("patient_id", id).single<Visit>();
  if (!visit) notFound();
  if (visit.status !== "draft") redirect(`/patients/${id}?tab=notes`);

  const [{ data: profile }, { data: visits }, { data: events }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single<Pick<Profile, "full_name">>(),
    supabase
      .from("visits")
      .select(
        "id, visit_at, visit_time, visit_type, status, subjective, objective, assessment, treatment, patient_response, plan, additional_notes, findings, created_at, profiles!visits_clinician_id_fkey(full_name)"
      )
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("audit_events")
      .select("id, action, created_at, profiles!audit_events_actor_id_fkey(full_name)")
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  const recent = (visits || []).map((row) => {
    const clinician = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { ...row, clinician: clinician?.full_name };
  });

  return (
    <>
      <p className="crumb">
        <Link href={`/patients/${id}?tab=notes`}>Back to notes</Link>
      </p>
      <h1>Continue draft</h1>
      <div className="soap-layout">
        <SessionForm
          action={updateVisit.bind(null, id, visitId)}
          clinicianName={profile?.full_name || "You"}
          error={error}
          visit={visit}
          continuity={(visits || []).some((row) => row.id !== visitId)}
        />
        <SessionRails
          visits={recent}
          events={(events || []).map((row) => {
            const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            return {
              id: row.id,
              text: `${actor?.full_name || "Staff"} ${auditCopy(row.action)}`,
              when: formatDateTime(row.created_at)
            };
          })}
        />
      </div>
    </>
  );
}
