import { StaffList } from "@/components/StaffList";
import { requireAdmin } from "@/lib/auth";
import type { Profile } from "@/lib/types";

export default async function ProvidersPage() {
  const { supabase } = await requireAdmin();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, created_at")
    .order("full_name")
    .returns<Profile[]>();
  const { data: assigned } = await supabase.from("patients").select("assigned_to, status");

  const counts = new Map<string, number>();
  (assigned || []).forEach((row) => {
    if (!row.assigned_to || row.status === "inactive") return;
    counts.set(row.assigned_to, (counts.get(row.assigned_to) || 0) + 1);
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Providers</h1>
          <p className="muted">Staff accounts. Invite new physiotherapists from Settings → Add physiotherapist.</p>
        </div>
      </div>
      <StaffList profiles={profiles || []} counts={counts} />
    </>
  );
}
