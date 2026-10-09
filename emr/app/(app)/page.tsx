import Link from "next/link";
import { IconPatients, IconProviders, IconSessions } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { auditCopy, clinicianLabel, firstName, lagosStamp, longDate, relativeTime, titleCase, uniqueVisitSlots, visitTypeLabel } from "@/lib/format";

function uniqueRecentNotes<T extends { patient_id: string; status?: string; created_at?: string }>(rows: T[]) {
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.patient_id}|${row.status || ""}|${(row.created_at || "").slice(0, 16)}`;
    if (!map.has(key)) map.set(key, row);
  }
  return Array.from(map.values());
}

export default async function DashboardPage() {
  const { supabase, user, isAdmin, profile } = await requireStaff();
  const today = lagosStamp().visit_at;
  const monthStart = today.slice(0, 8) + "01";

  const visitsTodayRows = supabase
    .from("visits")
    .select(
      "id, visit_at, visit_time, visit_type, patient_id, clinician_id, clinician_name, created_at, patients(rm_id, first_name, last_name, condition), profiles!visits_clinician_id_fkey(full_name)"
    )
    .eq("visit_at", today)
    .order("visit_time", { ascending: true });
  const activePatients = supabase.from("patients").select("*", { count: "exact", head: true }).eq("status", "active");
  const drafts = supabase.from("visits").select("*", { count: "exact", head: true }).eq("status", "draft");

  const [
    { data: todayVisits },
    { count: activeCount },
    { count: monthCount },
    { count: draftCount },
    { count: ptCount },
    { data: activity },
    { data: recentNotes }
  ] = await Promise.all([
    isAdmin ? visitsTodayRows : visitsTodayRows.eq("clinician_id", user.id),
    isAdmin ? activePatients : activePatients.eq("assigned_to", user.id),
    isAdmin
      ? supabase.from("patients").select("*", { count: "exact", head: true }).eq("status", "active").gte("created_at", monthStart)
      : supabase
          .from("patients")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .eq("assigned_to", user.id)
          .gte("created_at", monthStart),
    isAdmin ? drafts : drafts.eq("clinician_id", user.id),
    isAdmin
      ? supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "physiotherapist")
          .neq("status", "disabled")
      : Promise.resolve({ count: 0 }),
    isAdmin
      ? supabase
          .from("audit_events")
          .select("id, action, detail, created_at, actor_id, patient_id, profiles!audit_events_actor_id_fkey(full_name), patients(rm_id)")
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
    isAdmin
      ? Promise.resolve({ data: [] })
      : supabase
          .from("visits")
          .select(
            "id, visit_at, visit_time, visit_type, status, patient_id, created_at, patients(rm_id, first_name, last_name)"
          )
          .eq("clinician_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6)
  ]);

  const todayList = uniqueVisitSlots(todayVisits || []);
  const noteList = uniqueRecentNotes(recentNotes || []);
  const homeCount = todayList.filter((row) => row.visit_type === "home").length;
  const onlineCount = todayList.length - homeCount;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Welcome back, {firstName(profile?.full_name || "there")}. Here is what is happening today.</p>
        </div>
        <p className="muted">{longDate()}</p>
      </div>

      <section className="stats">
        <article className="stat">
          <div className="stat-icon">
            <IconSessions />
          </div>
          <b>{todayList.length}</b>
          <span>{isAdmin ? "Today’s sessions" : "My sessions today"}</span>
          <p className="muted">
            {homeCount} home · {onlineCount} online
          </p>
        </article>
        <article className="stat">
          <div className="stat-icon">
            <IconPatients />
          </div>
          <b>{activeCount || 0}</b>
          <span>{isAdmin ? "Active patients" : "My patients"}</span>
          <p className="muted">{isAdmin ? `${monthCount || 0} this month` : "Assigned to you"}</p>
        </article>
        <article className="stat">
          <div className="stat-icon">
            <IconSessions />
          </div>
          <b>{draftCount || 0}</b>
          <span>{isAdmin ? "Notes pending" : "My drafts"}</span>
          <p className="muted">Draft notes to complete</p>
        </article>
        {isAdmin ? (
          <article className="stat">
            <div className="stat-icon">
              <IconProviders />
            </div>
            <b>{ptCount || 0}</b>
            <span>Active physiotherapists</span>
            <p className="muted">Invite-only staff</p>
          </article>
        ) : null}
      </section>

      <div className="split">
        <section className="panel">
          <div className="page-head" style={{ marginBottom: "0.4rem" }}>
            <h2>{isAdmin ? "Today’s sessions" : "My sessions today"}</h2>
            <Link href="/sessions">View all</Link>
          </div>
          {(todayList || []).length ? (
            todayList.map((row) => {
              const patient = Array.isArray(row.patients) ? row.patients[0] : row.patients;
              const href = patient ? `/patients/${row.patient_id}?tab=timeline` : "/patients";
              return (
                <Link className="session-row" key={row.id} href={href}>
                  <span className="time">{(row.visit_time || "09:00").slice(0, 5)}</span>
                  <div>
                    <strong className="mono">{patient?.rm_id || "Patient"}</strong>
                    <div>
                      {patient ? `${patient.first_name} ${patient.last_name}` : "—"} · {titleCase(patient?.condition)}
                    </div>
                  </div>
                  <div className="session-aside">
                    <span className={`pill ${row.visit_type === "online" ? "pill-online" : "pill-home"}`}>
                      {visitTypeLabel(row.visit_type as string)}
                    </span>
                    {isAdmin ? (
                      <div className="muted">{clinicianLabel(row.profiles, row.clinician_name)}</div>
                    ) : null}
                    <span className="row-action">Open patient →</span>
                  </div>
                </Link>
              );
            })
          ) : (
            <p className="empty">No sessions dated today. Create a note from a patient record.</p>
          )}
        </section>
        {isAdmin ? (
          <section className="panel">
            <div className="page-head" style={{ marginBottom: "0.4rem" }}>
              <h2>Recent activity</h2>
              <Link href="/audit">View all</Link>
            </div>
            {(activity || []).length ? (
              (activity || []).map((row) => {
                const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
                const patient = Array.isArray(row.patients) ? row.patients[0] : row.patients;
                return (
                  <div className="activity-row" key={row.id} style={{ gridTemplateColumns: "1fr auto" }}>
                    <div>
                      <strong>{actor?.full_name || "Staff"}</strong> {auditCopy(row.action)}
                      {patient?.rm_id ? ` · ${patient.rm_id}` : row.detail ? ` · ${row.detail}` : ""}
                    </div>
                    <span className="muted">{relativeTime(row.created_at)}</span>
                  </div>
                );
              })
            ) : (
              <p className="empty">Activity will appear here as the team documents.</p>
            )}
          </section>
        ) : (
          <section className="panel">
            <div className="page-head" style={{ marginBottom: "0.4rem" }}>
              <h2>My recent notes</h2>
              <Link href="/sessions">View all</Link>
            </div>
            {(noteList || []).length ? (
              noteList.map((row) => {
                const patient = Array.isArray(row.patients) ? row.patients[0] : row.patients;
                return (
                  <Link
                    className="activity-row"
                    key={row.id}
                    href={
                      row.status === "draft"
                        ? `/patients/${row.patient_id}/sessions/${row.id}`
                        : `/patients/${row.patient_id}?tab=notes`
                    }
                    style={{ gridTemplateColumns: "1fr auto auto" }}
                  >
                    <div>
                      <strong className="mono">{patient?.rm_id || "Patient"}</strong>
                      {patient ? ` · ${patient.first_name} ${patient.last_name}` : ""}
                      {` · ${row.status === "draft" ? "Draft" : "Signed"}`}
                    </div>
                    <span className="row-action">{row.status === "draft" ? "Continue →" : "View session →"}</span>
                    <span className="muted">{relativeTime(row.created_at)}</span>
                  </Link>
                );
              })
            ) : (
              <p className="empty">Your notes will appear here as you document.</p>
            )}
          </section>
        )}
      </div>
    </>
  );
}
