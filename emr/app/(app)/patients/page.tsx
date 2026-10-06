import Link from "next/link";
import { Avatar, IconPlus, StatusPill } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { ageFromDob, avatarTone, formatDate, initials, sexLabel } from "@/lib/format";

const PAGE_SIZE = 8;

type PatientRow = {
  id: string;
  rm_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  city: string | null;
  sex: string | null;
  date_of_birth: string | null;
  condition: string | null;
  status: string;
  assigned_to: string | null;
  assigned: { full_name: string } | { full_name: string }[] | null;
  visits: { visit_at: string; created_at: string }[] | null;
};

export default async function PatientsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; condition?: string; status?: string; page?: string }>;
}) {
  const { q = "", condition = "", status = "", page = "1" } = await searchParams;
  const { supabase, user, isAdmin } = await requireStaff();
  const current = Math.max(1, Number(page) || 1);
  const from = (current - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let request = supabase
    .from("patients")
    .select(
      "id, rm_id, first_name, last_name, phone, city, sex, date_of_birth, condition, status, assigned_to, assigned:profiles!patients_assigned_to_fkey(full_name), visits(visit_at, created_at)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (!isAdmin) request = request.eq("assigned_to", user.id);

  const term = q.trim().replace(/,/g, " ");
  if (term) {
    request = request.or(
      `rm_id.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%`
    );
  }
  if (condition) request = request.eq("condition", condition);
  if (status === "active" || status === "inactive") request = request.eq("status", status);

  const { data: patients, count } = await request;
  let conditionQuery = supabase.from("patients").select("condition").not("condition", "is", null);
  if (!isAdmin) conditionQuery = conditionQuery.eq("assigned_to", user.id);
  const { data: conditionRows } = await conditionQuery;
  const conditions = Array.from(
    new Set((conditionRows || []).map((row) => row.condition).filter(Boolean) as string[])
  ).sort();

  const total = count || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (next: number) => {
    const params = new URLSearchParams();
    if (term) params.set("q", term);
    if (condition) params.set("condition", condition);
    if (status) params.set("status", status);
    params.set("page", String(next));
    return `/patients?${params.toString()}`;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Patients</h1>
          <p className="muted">
            {isAdmin ? "View and manage all patient records" : "Patients assigned to you"}
          </p>
        </div>
        <Link className="btn" href="/patients/new">
          <IconPlus />
          Add Patient
        </Link>
      </div>

      <form className="filters" action="/patients">
        <input name="q" defaultValue={q} placeholder="Search by name, ID or phone" />
        <select name="condition" defaultValue={condition}>
          <option value="">All conditions</option>
          {conditions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status}>
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="btn" type="submit">
          Search
        </button>
        <Link className="btn btn-ghost" href="/patients">
          Reset
        </Link>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Relief Motion ID</th>
              <th>Patient</th>
              <th>Condition</th>
              <th>Assigned physiotherapist</th>
              <th>Last session</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(patients as PatientRow[] | null)?.length ? (
              (patients as PatientRow[]).map((patient) => {
                const assigned = Array.isArray(patient.assigned) ? patient.assigned[0] : patient.assigned;
                const last = (patient.visits || [])
                  .slice()
                  .sort((a, b) => b.visit_at.localeCompare(a.visit_at) || b.created_at.localeCompare(a.created_at))[0];
                const name = `${patient.first_name} ${patient.last_name}`;
                const age = ageFromDob(patient.date_of_birth);
                return (
                  <tr key={patient.id}>
                    <td className="mono">{patient.rm_id}</td>
                    <td>
                      <div className="person">
                        <Avatar label={initials(name)} tone={avatarTone(name)} size="sm" />
                        <div>
                          <strong>
                            {patient.last_name}, {patient.first_name}
                          </strong>
                          <span className="muted">
                            {age ? `${age} yrs` : "Age —"}
                            {patient.sex ? ` · ${sexLabel(patient.sex)}` : ""}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{patient.condition || "—"}</td>
                    <td>{assigned?.full_name || "Unassigned"}</td>
                    <td>{last ? formatDate(last.visit_at) : "—"}</td>
                    <td>
                      <StatusPill status={patient.status || "active"} />
                    </td>
                    <td>
                      <Link className="link-btn" href={`/patients/${patient.id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="empty">
                  {term || condition || status
                    ? "No patients match that search."
                    : isAdmin
                      ? "No patients yet. Create a record to start documentation."
                      : "No patients assigned to you yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="pager">
          <span>
            Showing {total ? from + 1 : 0} to {Math.min(to + 1, total)} of {total} patients
          </span>
          <div className="pager-links">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link key={n} className={n === current ? "current" : ""} href={qs(n)}>
                {n}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
