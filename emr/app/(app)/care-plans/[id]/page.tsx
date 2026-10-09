import Link from "next/link";
import { notFound } from "next/navigation";
import {
  confirmSession,
  markSessionOutcome,
  reassignCarePlan,
  reopenSession,
  scheduleSession,
  startNextSession,
  updateCarePlanPayment
} from "@/app/actions";
import { requireStaff } from "@/lib/auth";
import { paymentStatusLabel, planProgress, sessionStatusClass, sessionStatusLabel } from "@/lib/care";
import { formatDate, formatNaira, formatTime, visitTypeLabel } from "@/lib/format";
import type { CarePlan, CareSession, Profile } from "@/lib/types";

export default async function CarePlanDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, isClinician, isAdmin, isOperations } = await requireStaff();
  const { data: plan } = await supabase
    .from("care_plans")
    .select(
      "*, patients(id, rm_id, first_name, last_name, city, condition), assigned:profiles!care_plans_assigned_to_fkey(full_name)"
    )
    .eq("id", id)
    .single();
  if (!plan) notFound();

  const [{ data: slots }, { data: notes }, { data: clinicians }] = await Promise.all([
    supabase
      .from("sessions")
      .select("*, profiles!sessions_clinician_id_fkey(full_name)")
      .eq("care_plan_id", id)
      .order("session_number")
      .returns<CareSession[]>(),
    isClinician
      ? supabase.from("visits").select("id, session_id, status").eq("patient_id", plan.patient_id)
      : Promise.resolve({ data: [] as { id: string; session_id: string | null; status: string }[] }),
    supabase
      .from("profiles")
      .select("id, full_name, role, status")
      .eq("role", "physiotherapist")
      .neq("status", "disabled")
      .order("full_name")
      .returns<Profile[]>()
  ]);

  const patient = Array.isArray(plan.patients) ? plan.patients[0] : plan.patients;
  const clinician = Array.isArray(plan.assigned) ? plan.assigned[0] : plan.assigned;
  const progress = planProgress(slots || [], plan.sessions_purchased);
  const noteBySession = new Map((notes || []).map((row) => [row.session_id, row]));
  const canManage = isAdmin || isOperations;

  return (
    <>
      <p className="crumb">
        <Link href="/care-plans">Care Plans</Link> · {patient?.rm_id}
      </p>
      {error ? <div className="error">{error}</div> : null}

      <section className="panel">
        <div className="page-head">
          <div>
            <p className="mono">{patient?.rm_id}</p>
            <h1>
              {patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}
            </h1>
            <p className="muted">
              {plan.title} · {visitTypeLabel(plan.service_type)} · {plan.sessions_purchased}-session package
            </p>
          </div>
          {isClinician ? (
            <form action={startNextSession.bind(null, plan.patient_id)}>
              <input type="hidden" name="care_plan_id" value={plan.id} />
              <button className="btn" type="submit">
                Start next session
              </button>
            </form>
          ) : (
            <Link className="btn" href={`/bookings/new?patient=${plan.patient_id}`}>
              Schedule session
            </Link>
          )}
        </div>
        <div className="progress-bar progress-lg">
          <span style={{ width: `${progress.pct}%` }} />
        </div>
        <p>
          <strong>
            {progress.consumed} / {plan.sessions_purchased} completed
          </strong>
          <span className="muted"> · {progress.remaining} sessions remaining · {paymentStatusLabel(plan.payment_status)}</span>
        </p>
        {plan.start_date ? <p className="muted">Started {formatDate(plan.start_date)}</p> : null}
        <p className="muted">Physiotherapist: {clinician?.full_name || "Unassigned"}</p>
      </section>

      <section className="panel">
        <h2>Sessions</h2>
        <div className="table-wrap" style={{ border: 0, boxShadow: "none" }}>
          <table>
            <thead>
              <tr>
                <th>Session</th>
                <th>Date</th>
                <th>PT</th>
                <th>Status</th>
                <th>Clinical note</th>
                {canManage ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {(slots || []).map((slot) => {
                const pt = Array.isArray((slot as CareSession & { profiles?: { full_name: string } }).profiles)
                  ? (slot as unknown as { profiles: { full_name: string }[] }).profiles[0]
                  : (slot as unknown as { profiles?: { full_name: string } }).profiles;
                const note = noteBySession.get(slot.id);
                return (
                  <tr key={slot.id}>
                    <td>
                      {slot.session_number} of {plan.sessions_purchased}
                    </td>
                    <td>
                      {slot.scheduled_date ? `${formatDate(slot.scheduled_date)}${slot.scheduled_time ? ` · ${formatTime(slot.scheduled_time)}` : ""}` : "—"}
                    </td>
                    <td>{pt?.full_name || "—"}</td>
                    <td>
                      <span className={`pill ${sessionStatusClass(slot.status)}`}>{sessionStatusLabel(slot.status)}</span>
                    </td>
                    <td>
                      {note ? (note.status === "signed" ? "Signed ✓" : "Draft") : "—"}
                    </td>
                    {canManage ? (
                      <td>
                        <SlotActions slot={slot} plan={plan as CarePlan} clinicians={clinicians || []} />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {canManage ? (
        <div className="split">
          <section className="panel">
            <h2>Reassign physiotherapist</h2>
            <form action={reassignCarePlan.bind(null, plan.id)}>
              <select name="assigned_to" defaultValue={plan.assigned_to || ""}>
                <option value="">Unassigned</option>
                {(clinicians || []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.full_name}
                  </option>
                ))}
              </select>
              <button className="btn btn-ghost" type="submit" style={{ marginTop: "0.6rem" }}>
                Save
              </button>
            </form>
          </section>
          <section className="panel">
            <h2>Payment</h2>
            <form action={updateCarePlanPayment.bind(null, plan.id)}>
              <input type="hidden" name="return_to" value={`/care-plans/${plan.id}`} />
              <div className="grid-2">
                <div>
                  <label>Status</label>
                  <select name="payment_status" defaultValue={plan.payment_status}>
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label>Amount (naira)</label>
                  <input name="amount_naira" type="number" min={0} defaultValue={plan.amount_naira || ""} />
                </div>
              </div>
              <p className="muted" style={{ margin: "0.4rem 0 0.8rem" }}>
                {formatNaira(plan.amount_naira)}
              </p>
              <button className="btn btn-ghost" type="submit">
                Update payment
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function SlotActions({
  slot,
  plan,
  clinicians
}: {
  slot: CareSession;
  plan: CarePlan;
  clinicians: Profile[];
}) {
  if (slot.status === "completed") return <span className="muted">Done</span>;
  const cancelled = slot.status === "cancelled" || slot.status === "no_show";
  return (
    <div className="slot-actions">
      {cancelled && !slot.counts_against_package ? (
        <form action={reopenSession.bind(null, slot.id)}>
          <input type="hidden" name="return_to" value={`/care-plans/${plan.id}`} />
          <button className="btn btn-ghost" type="submit">
            Reopen
          </button>
        </form>
      ) : null}
      {slot.status === "scheduled" ? (
        <form action={confirmSession.bind(null, slot.id)}>
          <input type="hidden" name="return_to" value={`/care-plans/${plan.id}`} />
          <button className="btn btn-ghost" type="submit">
            Confirm
          </button>
        </form>
      ) : null}
      <details>
          <summary>Schedule</summary>
          <form action={scheduleSession.bind(null, slot.id)}>
            <input type="hidden" name="plan_id" value={plan.id} />
            <input type="hidden" name="return_to" value={`/care-plans/${plan.id}`} />
            <input name="scheduled_date" type="date" required defaultValue={slot.scheduled_date || ""} />
            <input name="scheduled_time" type="time" defaultValue={slot.scheduled_time?.slice(0, 5) || "09:00"} />
            <select name="clinician_id" defaultValue={slot.clinician_id || plan.assigned_to || ""}>
              <option value="">Unassigned</option>
              {clinicians.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.full_name}
                </option>
              ))}
            </select>
            <button className="btn" type="submit">
              Save
            </button>
          </form>
        </details>
      {!cancelled ? (
        <details>
          <summary>Cancel / no-show</summary>
          <form action={markSessionOutcome.bind(null, slot.id)}>
            <input type="hidden" name="return_to" value={`/care-plans/${plan.id}`} />
            <select name="outcome" defaultValue="cancelled">
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No-show</option>
            </select>
            <label className="muted">
              <input type="checkbox" name="counts_against_package" value="1" style={{ width: "auto" }} /> Count against package
            </label>
            <button className="btn btn-ghost" type="submit">
              Save
            </button>
          </form>
        </details>
      ) : null}
    </div>
  );
}
