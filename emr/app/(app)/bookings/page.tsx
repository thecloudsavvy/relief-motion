import Link from "next/link";
import { confirmSession } from "@/app/actions";
import { requireOperations } from "@/lib/auth";
import { sessionStatusClass, sessionStatusLabel, weekdayShort } from "@/lib/care";
import { formatTime, visitTypeLabel } from "@/lib/format";
import type { CareSession } from "@/lib/types";

type Row = CareSession & {
  patients: { rm_id: string; first_name: string; last_name: string } | { rm_id: string; first_name: string; last_name: string }[] | null;
  care_plans: { title: string; sessions_purchased: number } | { title: string; sessions_purchased: number }[] | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

function one<T>(value: T | T[] | null | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

export default async function BookingsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { status = "", error } = await searchParams;
  const { supabase } = await requireOperations();
  let request = supabase
    .from("sessions")
    .select(
      "id, care_plan_id, patient_id, session_number, scheduled_date, scheduled_time, visit_type, location, status, clinician_id, patients(rm_id, first_name, last_name), care_plans(title, sessions_purchased), profiles!sessions_clinician_id_fkey(full_name)"
    )
    .neq("status", "not_scheduled")
    .order("scheduled_date", { ascending: true, nullsFirst: false })
    .order("scheduled_time", { ascending: true })
    .limit(80);

  if (status && ["scheduled", "confirmed", "completed", "cancelled", "no_show"].includes(status)) {
    request = request.eq("status", status);
  }

  const { data } = await request;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bookings</h1>
          <p className="muted">What is happening today and tomorrow — not the clinical note.</p>
        </div>
        <div className="head-actions">
          <Link className="btn btn-ghost" href="/care-plans/new">
            New care plan
          </Link>
          <Link className="btn" href="/bookings/new">
            New booking
          </Link>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <form className="filters" action="/bookings">
        <select name="status" defaultValue={status}>
          <option value="">All booked sessions</option>
          <option value="scheduled">Pending confirmation</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No-show</option>
        </select>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Patient</th>
              <th>Care plan</th>
              <th>Session</th>
              <th>Physiotherapist</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data as Row[] | null)?.length ? (
              (data as Row[]).map((row) => {
                const patient = one(row.patients);
                const plan = one(row.care_plans);
                const clinician = one(row.profiles);
                return (
                  <tr key={row.id}>
                    <td>{weekdayShort(row.scheduled_date)}</td>
                    <td>{formatTime(row.scheduled_time) || "—"}</td>
                    <td>
                      <Link href={`/patients/${row.patient_id}`}>
                        {patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}
                      </Link>
                      <div className="muted mono">{patient?.rm_id}</div>
                    </td>
                    <td>
                      <Link href={`/care-plans/${row.care_plan_id}`}>{plan?.title || "Care plan"}</Link>
                      <div className="muted">{visitTypeLabel(row.visit_type)}</div>
                    </td>
                    <td>
                      {row.session_number} of {plan?.sessions_purchased || "—"}
                    </td>
                    <td>{clinician?.full_name || "Unassigned"}</td>
                    <td>
                      <span className={`pill ${sessionStatusClass(row.status)}`}>{sessionStatusLabel(row.status)}</span>
                    </td>
                    <td>
                      {row.status === "scheduled" ? (
                        <form action={confirmSession.bind(null, row.id)}>
                          <input type="hidden" name="return_to" value="/bookings" />
                          <button className="btn btn-ghost" type="submit">
                            Confirm
                          </button>
                        </form>
                      ) : (
                        <Link href={`/care-plans/${row.care_plan_id}`}>Open</Link>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="empty">
                  No bookings yet. Create a care plan, then schedule sessions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
