import { Avatar } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { avatarTone, initials } from "@/lib/format";
import type { Profile } from "@/lib/types";

export default async function ProvidersPage() {
  const { supabase } = await requireAdmin();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
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
          <p className="muted">Staff accounts. Invite new physiotherapists from the Supabase Auth dashboard.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Clinician</th>
              <th>Role</th>
              <th>Active patients</th>
            </tr>
          </thead>
          <tbody>
            {(profiles || []).map((profile) => (
              <tr key={profile.id}>
                <td>
                  <div className="person">
                    <Avatar label={initials(profile.full_name || "Staff")} tone={avatarTone(profile.id)} />
                    <strong>{profile.full_name || "Unnamed staff"}</strong>
                  </div>
                </td>
                <td>{profile.role === "admin" ? "Admin" : "Physiotherapist"}</td>
                <td>{counts.get(profile.id) || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
