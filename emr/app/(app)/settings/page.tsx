import { cookies } from "next/headers";
import Link from "next/link";
import { invitePhysiotherapist, requestPasswordReset, updateOwnName, updateStaffRole } from "@/app/actions";
import { DeleteStaffButton } from "@/components/DeleteStaffButton";
import { QueryFlash } from "@/components/QueryFlash";
import { Avatar } from "@/components/ui";
import { StaffList } from "@/components/StaffList";
import { requireStaff } from "@/lib/auth";
import { formatDate, formatDateTime, initials } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { redirect } from "next/navigation";

function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4.2 0-8 2-8 5.2V21h16v-1.8C20 16 16.2 14 12 14z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 10V8a4 4 0 0 1 8 0v2h1.5A1.5 1.5 0 0 1 19 11.5v8A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10zm2 0h4V8a2 2 0 0 0-4 0z" />
    </svg>
  );
}

function IconStaff() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 11a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 9 11zm7.5 0A3 3 0 1 0 13.5 8a3 3 0 0 0 3 3zM3 19.2C3 16.4 6.1 15 9 15s6 1.4 6 4.2V20H3zm12.2-.2c.4-1.7 2-2.8 4.3-2.8 2.6 0 4.5 1.2 4.5 3.4V20h-8.8z" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v6c0 4.4 2.9 8.4 7 9.5 4.1-1.1 7-5.1 7-9.5V6z" />
    </svg>
  );
}

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; ok?: string; tab?: string }>;
}) {
  const { tab = "profile" } = await searchParams;
  const inviteLink = (await cookies()).get("rm_invite_link")?.value || "";
  const { supabase, user, profile, isAdmin } = await requireStaff();
  const {
    data: { user: authUser }
  } = await supabase.auth.getUser();
  const name = profile?.full_name || authUser?.email || "Staff";
  const roleLabel = isAdmin ? "Admin" : "Physiotherapist";
  const section =
    tab === "security" ||
    (isAdmin && (tab === "staff" || tab === "invite" || tab === "roles"))
      ? tab === "staff"
        ? "invite"
        : tab
      : "profile";
  if ((tab === "staff" || tab === "invite" || tab === "roles") && !isAdmin) redirect("/settings");

  let staff: Profile[] = [];
  const counts = new Map<string, number>();
  if (isAdmin && (section === "invite" || section === "roles")) {
    const [{ data: profiles }, { data: assigned }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, role, status, created_at").order("full_name").returns<Profile[]>(),
      supabase.from("patients").select("assigned_to, status")
    ]);
    staff = profiles || [];
    (assigned || []).forEach((row) => {
      if (!row.assigned_to || row.status === "inactive") return;
      counts.set(row.assigned_to, (counts.get(row.assigned_to) || 0) + 1);
    });
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">
            {isAdmin ? "Manage your profile, staff access, and account security." : "Manage your profile and account security."}
          </p>
        </div>
      </div>

      <QueryFlash inviteLink={inviteLink} />

      <div className="settings-layout">
        <nav className="settings-nav">
          <Link className={section === "profile" ? "active" : ""} href="/settings">
            <IconProfile />
            My Profile
          </Link>
          {isAdmin ? (
            <>
              <Link className={section === "invite" ? "active" : ""} href="/settings?tab=invite">
                <IconStaff />
                Add physiotherapist
              </Link>
              <Link className={section === "roles" ? "active" : ""} href="/settings?tab=roles">
                <IconShield />
                Roles &amp; Permissions
              </Link>
            </>
          ) : null}
          <Link className={section === "security" ? "active" : ""} href="/settings?tab=security">
            <IconLock />
            Security
          </Link>
        </nav>

        {section === "profile" ? (
          <div className="settings-main">
            <form className="panel" action={updateOwnName}>
              <div className="settings-hero">
                <Avatar label={initials(name)} size="lg" />
                <div>
                  <h2>My Profile</h2>
                  <p className="muted">View and update your personal information.</p>
                  <div className="settings-hero-meta">
                    <strong>{name}</strong>
                    <span className="pill pill-ok">{roleLabel}</span>
                  </div>
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label htmlFor="full_name">Display name</label>
                  <input id="full_name" name="full_name" defaultValue={profile?.full_name || ""} required />
                </div>
                <div>
                  <label>Email address</label>
                  <input value={authUser?.email || ""} disabled />
                </div>
                <div>
                  <label>Role</label>
                  <input value={roleLabel} disabled />
                </div>
              </div>
              <p className="muted" style={{ marginBottom: "1rem" }}>
                {isAdmin
                  ? "Change another person’s role under Roles & Permissions."
                  : "Role is assigned by an administrator. Email changes stay with the administrator."}
              </p>
              <button className="btn" type="submit">
                Save changes
              </button>
            </form>
          </div>
        ) : null}

        {section === "invite" ? (
          <div className="settings-main">
            <form className="panel" action={invitePhysiotherapist}>
              <h2>Add physiotherapist</h2>
              <p className="muted" style={{ marginBottom: "1rem" }}>
                Creates their staff profile and emails an invite. They sign in as a physiotherapist. Promote them
                under Roles &amp; Permissions if they should be an admin.
              </p>
              <div className="grid-2">
                <div>
                  <label htmlFor="invite_name">Full name</label>
                  <input id="invite_name" name="full_name" required placeholder="e.g. Adebayo Halamin" />
                </div>
                <div>
                  <label htmlFor="invite_email">Work email</label>
                  <input id="invite_email" name="email" type="email" required placeholder="name@reliefmotionphysio.com" />
                </div>
              </div>
              <button className="btn" type="submit">
                Send invite
              </button>
            </form>
            <section className="panel">
              <h2>Staff</h2>
              <StaffList profiles={staff} counts={counts} />
            </section>
          </div>
        ) : null}

        {section === "roles" ? (
          <div className="settings-main">
            <section className="panel">
              <h2>Roles &amp; Permissions</h2>
              <p className="muted" style={{ marginBottom: "1rem" }}>
                What each role can do in this EMR.
              </p>
              <div className="table-wrap" style={{ border: 0, boxShadow: "none" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Capability</th>
                      <th>Admin</th>
                      <th>Physiotherapist</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Patients</td>
                      <td>All records, including unassigned</td>
                      <td>Assigned to them only</td>
                    </tr>
                    <tr>
                      <td>Assign physiotherapist</td>
                      <td>Yes</td>
                      <td>No</td>
                    </tr>
                    <tr>
                      <td>Providers, audit log</td>
                      <td>Yes</td>
                      <td>No</td>
                    </tr>
                    <tr>
                      <td>Staff roles</td>
                      <td>Yes</td>
                      <td>No</td>
                    </tr>
                    <tr>
                      <td>Create patients</td>
                      <td>Yes</td>
                      <td>Yes, assigned to themselves</td>
                    </tr>
                    <tr>
                      <td>Session notes</td>
                      <td>Network-wide</td>
                      <td>Their assigned patients</td>
                    </tr>
                    <tr>
                      <td>Sign in</td>
                      <td>Yes, unless disabled</td>
                      <td>Yes, unless disabled</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <h2>Assign roles</h2>
              <p className="muted" style={{ marginBottom: "1rem" }}>
                Disable a physiotherapist the same way you change a role. After they are disabled, you can delete them
                from this list. Session notes stay on the patient chart. You cannot change your own access, and the last
                administrator cannot be removed or disabled.
              </p>
              <div className="table-wrap" style={{ border: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Staff</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((member) => {
                      const self = member.id === user.id;
                      const roleLabel = member.role === "admin" ? "Admin" : "Physiotherapist";
                      const statusLabel = member.status === "disabled" ? "Disabled" : "Active";
                      return (
                      <tr key={member.id}>
                        <td>
                          <div className="person">
                            <Avatar label={initials(member.full_name || "Staff")} />
                            <strong>
                              {member.full_name || "Unnamed staff"}
                              {self ? " (you)" : ""}
                            </strong>
                          </div>
                        </td>
                        {self ? (
                          <>
                            <td>{roleLabel}</td>
                            <td colSpan={2}>{statusLabel}</td>
                          </>
                        ) : (
                          <td colSpan={3}>
                            <div className="role-row">
                              <form className="role-form" action={updateStaffRole}>
                                <input type="hidden" name="staff_id" value={member.id} />
                                <select name="role" defaultValue={member.role} aria-label="Role">
                                  <option value="physiotherapist">Physiotherapist</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <select
                                  name="status"
                                  defaultValue={member.status === "disabled" ? "disabled" : "active"}
                                  aria-label="Status"
                                >
                                  <option value="active">Active</option>
                                  <option value="disabled">Disabled</option>
                                </select>
                                <button className="btn btn-ghost" type="submit">
                                  Save
                                </button>
                              </form>
                              {member.status === "disabled" ? (
                                <DeleteStaffButton staffId={member.id} name={member.full_name || "this staff member"} />
                              ) : null}
                            </div>
                          </td>
                        )}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}

        {section === "security" ? (
          <div className="settings-main">
            <section className="panel">
              <h2>Security</h2>
              <p className="muted" style={{ marginBottom: "1rem" }}>
                Manage your password. Two-factor authentication is not in use yet.
              </p>
              <div className="settings-row">
                <div>
                  <strong>Change password</strong>
                  <p className="muted">We’ll send a reset link to {authUser?.email || "your email"}.</p>
                </div>
                <form action={requestPasswordReset}>
                  <button className="btn btn-ghost" type="submit">
                    Send reset link
                  </button>
                </form>
              </div>
            </section>
            <section className="panel">
              <h2>Account information</h2>
              <dl className="settings-dl">
                <div>
                  <dt>Account status</dt>
                  <dd>
                    <span className="pill pill-ok">Active</span>
                  </dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{roleLabel}</dd>
                </div>
                <div>
                  <dt>Member since</dt>
                  <dd>{formatDate(profile?.created_at || authUser?.created_at || null)}</dd>
                </div>
                <div>
                  <dt>Last login</dt>
                  <dd>{formatDateTime(authUser?.last_sign_in_at || null)}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{authUser?.email || "—"}</dd>
                </div>
              </dl>
            </section>
          </div>
        ) : null}
      </div>
    </>
  );
}
