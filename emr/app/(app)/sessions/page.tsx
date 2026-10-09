import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { clinicianLabel, formatDate, visitTypeLabel } from "@/lib/format";

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
      "id, visit_at, visit_time, visit_type, status, patient_id, clinician_name, patients!inner(rm_id, first_name, last_name, assigned_to), profiles!visits_clinician_id_fkey(full_name)"
    )
    .order("visit_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(80);

  if (!isAdmin) request = request.eq("patients.assigned_to", user.id);
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
          <p className="muted">
            {isAdmin ? "All visit notes across the network" : "Visit notes for your assigned patients"}
          </p>
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
                    <td>{clinicianLabel(row.profiles, row.clinician_name)}</td>
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
                  {term || status
                    ? "No sessions match that search."
                    : "No sessions yet. Document a visit from a patient record."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
