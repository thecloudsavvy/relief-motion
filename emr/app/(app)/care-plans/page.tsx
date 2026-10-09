import Link from "next/link";
import { requireOperations } from "@/lib/auth";
import { paymentStatusLabel, planProgress } from "@/lib/care";
import { formatDate, visitTypeLabel } from "@/lib/format";
import type { CareSession } from "@/lib/types";

export default async function CarePlansPage() {
  const { supabase } = await requireOperations();
  const { data: plans } = await supabase
    .from("care_plans")
    .select(
      "id, title, service_type, sessions_purchased, start_date, status, payment_status, amount_naira, patients(id, rm_id, first_name, last_name), assigned:profiles!care_plans_assigned_to_fkey(full_name), sessions(counts_against_package, status)"
    )
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Care Plans</h1>
          <p className="muted">How much care each patient has purchased, and how much remains.</p>
        </div>
        <Link className="btn" href="/care-plans/new">
          New care plan
        </Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Plan</th>
              <th>Progress</th>
              <th>Physiotherapist</th>
              <th>Payment</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(plans || []).length ? (
              (plans || []).map((plan) => {
                const patient = Array.isArray(plan.patients) ? plan.patients[0] : plan.patients;
                const clinician = Array.isArray(plan.assigned) ? plan.assigned[0] : plan.assigned;
                const progress = planProgress((plan.sessions || []) as CareSession[], plan.sessions_purchased);
                return (
                  <tr key={plan.id}>
                    <td>
                      <Link href={patient ? `/patients/${patient.id}` : "/patients"}>
                        {patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}
                      </Link>
                      <div className="muted mono">{patient?.rm_id}</div>
                    </td>
                    <td>
                      <div>{plan.title}</div>
                      <div className="muted">
                        {visitTypeLabel(plan.service_type)}
                        {plan.start_date ? ` · ${formatDate(plan.start_date)}` : ""}
                      </div>
                    </td>
                    <td>
                      <div className="progress-bar">
                        <span style={{ width: `${progress.pct}%` }} />
                      </div>
                      <div className="muted">
                        {progress.consumed} / {plan.sessions_purchased} · {progress.remaining} remaining
                      </div>
                    </td>
                    <td>{clinician?.full_name || "Unassigned"}</td>
                    <td>{paymentStatusLabel(plan.payment_status)}</td>
                    <td>
                      <span className={`pill ${plan.status === "active" ? "pill-ok" : "pill-muted"}`}>{plan.status}</span>
                    </td>
                    <td>
                      <Link href={`/care-plans/${plan.id}`}>Open</Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="empty">
                  No care plans yet. Create one when a patient books a package.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
