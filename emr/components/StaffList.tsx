import { Avatar } from "@/components/ui";
import { avatarTone, initials } from "@/lib/format";
import type { Profile } from "@/lib/types";

export function StaffList({
  profiles,
  counts
}: {
  profiles: Profile[];
  counts: Map<string, number>;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Clinician</th>
              <th>Role</th>
              <th>Status</th>
              <th>Active patients</th>
          </tr>
        </thead>
        <tbody>
          {profiles.length ? (
            profiles.map((profile) => (
              <tr key={profile.id}>
                <td>
                  <div className="person">
                    <Avatar label={initials(profile.full_name || "Staff")} tone={avatarTone(profile.id)} />
                    <strong>{profile.full_name || "Unnamed staff"}</strong>
                  </div>
                </td>
                <td>{profile.role === "admin" ? "Admin" : "Physiotherapist"}</td>
                <td>
                  <span className={`pill ${profile.status === "disabled" ? "pill-muted" : "pill-ok"}`}>
                    {profile.status === "disabled" ? "Disabled" : "Active"}
                  </span>
                </td>
                <td>{counts.get(profile.id) || 0}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="empty">
                No staff accounts yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
