import Link from "next/link";
import { addVisit } from "@/app/actions";
import { SessionForm, SessionRails } from "@/components/SessionForm";
import { requirePatientAccess } from "@/lib/auth";
import { auditCopy, formatDateTime, titleCase, uniqueVisitSlots } from "@/lib/format";
import type { Profile } from "@/lib/types";

export default async function NewSessionPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, user, patient, isAdmin } = await requirePatientAccess(id);

  const [{ data: profile }, { data: visits }, { data: events }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single<Pick<Profile, "full_name">>(),
    supabase
      .from("visits")
      .select(
        "id, visit_at, visit_time, visit_type, status, subjective, objective, assessment, treatment, patient_response, plan, additional_notes, findings, created_at, profiles!visits_clinician_id_fkey(full_name)"
      )
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .limit(8),
    isAdmin
      ? supabase
          .from("audit_events")
          .select("id, action, created_at, profiles!audit_events_actor_id_fkey(full_name)")
          .eq("patient_id", id)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] })
  ]);

  const recent = uniqueVisitSlots(visits || []).slice(0, 4).map((row) => {
    const clinician = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { ...row, clinician: clinician?.full_name };
  });
  const continuity = recent.length > 0;

  return (
    <>
      <p className="crumb">
        <Link href="/patients">Patients</Link> ·{" "}
        <Link href={`/patients/${id}`}>{patient.rm_id}</Link> · {continuity ? "Follow-up session" : "New session note"}
      </p>
      <div className="page-head">
        <div>
          <h1>{continuity ? "Follow-up session" : "New session note"}</h1>
          <p className="muted">
            {patient.first_name} {patient.last_name} · {titleCase(patient.condition)}
          </p>
        </div>
      </div>
      <div className="soap-layout">
        <SessionForm
          action={addVisit.bind(null, id)}
          clinicianName={profile?.full_name || "You"}
          error={error}
          continuity={continuity}
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
