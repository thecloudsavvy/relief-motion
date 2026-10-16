import { StaffList } from "@/components/StaffList";
import { requireAdmin } from "@/lib/auth";
import { physioDutyIds } from "@/lib/duty";
import { staffAuthById } from "@/lib/staff-auth";
import type { Profile } from "@/lib/types";

export default async function ProvidersPage({
  searchParams
}: {
  searchParams: Promise<{ duty?: string }>;
}) {
  const { duty = "" } = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: profiles }, { data: assigned }, dutyIds, authById] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, status, created_at")
      .order("full_name")
      .returns<Profile[]>(),
    supabase.from("patients").select("assigned_to, status"),
    duty === "today" ? physioDutyIds(supabase) : Promise.resolve([] as string[]),
    staffAuthById()
  ]);

  const counts = new Map<string, number>();
  (assigned || []).forEach((row) => {
    if (!row.assigned_to || row.status === "inactive") return;
    counts.set(row.assigned_to, (counts.get(row.assigned_to) || 0) + 1);
  });

  const onDuty = new Set(dutyIds);
  const rows =
    duty === "today" ? (profiles || []).filter((row) => onDuty.has(row.id)) : profiles || [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{duty === "today" ? "Physios on duty" : "Providers"}</h1>
          <p className="muted">
            {duty === "today"
              ? "Physiotherapists who opened the EMR or documented a record today (Lagos)."
              : "Staff accounts. Invite new physiotherapists from Settings → Add physiotherapist."}
          </p>
        </div>
      </div>
      <StaffList
        profiles={rows}
        counts={counts}
        authById={authById}
        empty={
          duty === "today"
            ? "No physiotherapist has opened the EMR or documented today."
            : "No staff accounts yet."
        }
      />
    </>
  );
}
