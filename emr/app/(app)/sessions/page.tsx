import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { formatDate, visitTypeLabel } from "@/lib/format";

export default async function SessionsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "" } = await searchParams;
  const { supabase, user, isAdmin } = await requireStaff();
  let request = supabase
    .from("visits")
    .select(
      "id, visit_at, visit_time, visit_type, status, patient_id, patients(rm_id, first_name, last_name), profiles!visits_clinician_id_fkey(full_name)"
    )
    .order("visit_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(80);

  if (!isAdmin) request = request.eq("clinician_id", user.id);
  if (status === "draft" || status === "signed") request = request.eq("status", status);

  const { data: visits } = await request;
  const term = q.trim().toLowerCase();
  const rows = (visits || []).filter((row) => {
    if (!term) return true;
    const patient = Array.isArray(row.patients) ? row.patients[0] : row.patients;
    const hay = `${patient?.rm_id || ""} ${patient?.first_name || ""} ${patient?.last_name || ""}`.toLowerCase();
    return hay.includes(term);
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sessions</h1>
          <p className="muted">{isAdmin ? "All visit notes across the network" : "Your visit notes"}</p>
        </div>
      </div>
      <form className="filters" action="/sessions">
        <input name="q" defaultValue={q} placeholder="Search by name or RM ID" />
        <select name="status" defaultValue={status}>
          <option value="">All notes</option>
          <option value="signed">Signed</option>
          <option value="draft">Drafts</option>
        </select>
        <button className="btn" type="submit">
          Search
        </button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Patient</th>
              <th>Type</th>
              <th>Clinician</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => {
                const patient = Array.isArray(row.patients) ? row.patients[0] : row.patients;
                const clinician = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
                return (
                  <tr key={row.id}>
                    <td>
                      {formatDate(row.visit_at)}
                      {row.visit_time ? ` · ${String(row.visit_time).slice(0, 5)}` : ""}
                    </td>
                    <td>
                      <div>
                        <span className="mono">{patient?.rm_id}</span>
                        <div>
                          {patient?.first_name} {patient?.last_name}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${row.visit_type === "online" ? "pill-online" : "pill-home"}`}>
                        {visitTypeLabel(row.visit_type)}
                      </span>
                    </td>
                    <td>{clinician?.full_name || "Staff"}</td>
                    <td>
                      <span className={`pill ${row.status === "draft" ? "pill-draft" : "pill-ok"}`}>
                        {row.status === "draft" ? "Draft" : "Signed"}
                      </span>
                    </td>
                    <td>
                      <Link href={`/patients/${row.patient_id}?tab=notes`}>Open</Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="empty">
                  No sessions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
