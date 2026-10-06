import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { auditCopy, formatDateTime } from "@/lib/format";

export default async function AuditPage() {
  const { supabase } = await requireAdmin();
  const { data: events } = await supabase
    .from("audit_events")
    .select(
      "id, action, detail, created_at, profiles!audit_events_actor_id_fkey(full_name), patients(id, rm_id, first_name, last_name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Audit log</h1>
          <p className="muted">Who opened, created, or updated records</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Staff</th>
              <th>Action</th>
              <th>Patient</th>
            </tr>
          </thead>
          <tbody>
            {(events || []).length ? (
              (events || []).map((row) => {
                const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
                const patient = Array.isArray(row.patients) ? row.patients[0] : row.patients;
                return (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.created_at)}</td>
                    <td>{actor?.full_name || "Staff"}</td>
                    <td>
                      {auditCopy(row.action)}
                      {row.detail ? ` · ${row.detail}` : ""}
                    </td>
                    <td>
                      {patient ? (
                        <Link href={`/patients/${patient.id}`}>{patient.rm_id}</Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="empty">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
