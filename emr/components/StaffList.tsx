import { resendStaffInvite } from "@/app/actions";
import { Avatar } from "@/components/ui";
import { avatarTone, initials, roleLabel } from "@/lib/format";
import { staffAccess, type StaffAuth } from "@/lib/staff-auth";
import type { Profile } from "@/lib/types";

export function StaffList({
  profiles,
  counts,
  authById,
  allowResend = false,
  empty = "No staff accounts yet."
}: {
  profiles: Profile[];
  counts: Map<string, number>;
  authById?: Map<string, StaffAuth>;
  allowResend?: boolean;
  empty?: string;
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
            {allowResend ? <th></th> : null}
          </tr>
        </thead>
        <tbody>
          {profiles.length ? (
            profiles.map((profile) => {
              const auth = authById?.get(profile.id);
              const access = staffAccess(profile, auth);
              return (
                <tr key={profile.id}>
                  <td>
                    <div className="person">
                      <Avatar label={initials(profile.full_name || "Staff")} tone={avatarTone(profile.id)} />
                      <div>
                        <strong>{profile.full_name || "Unnamed staff"}</strong>
                        {auth?.email ? <span className="muted">{auth.email}</span> : null}
                      </div>
                    </div>
                  </td>
                  <td>{roleLabel(profile.role)}</td>
                  <td>
                    <span
                      className={`pill ${
                        access === "active" ? "pill-ok" : access === "disabled" ? "pill-muted" : "pill-draft"
                      }`}
                    >
                      {access === "active" ? "Active" : access === "disabled" ? "Disabled" : "Invited"}
                    </span>
                  </td>
                  <td>{counts.get(profile.id) || 0}</td>
                  {allowResend ? (
                    <td>
                      {access === "invited" ? (
                        <form action={resendStaffInvite}>
                          <input type="hidden" name="staff_id" value={profile.id} />
                          <button className="btn btn-ghost" type="submit">
                            Resend invite
                          </button>
                        </form>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={allowResend ? 5 : 4} className="empty">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
