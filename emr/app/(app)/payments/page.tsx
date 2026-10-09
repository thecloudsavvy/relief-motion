import Link from "next/link";
import { updateCarePlanPayment } from "@/app/actions";
import { requireOperations } from "@/lib/auth";
import { paymentStatusLabel } from "@/lib/care";
import { formatNaira } from "@/lib/format";

export default async function PaymentsPage({
  searchParams
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const { supabase } = await requireOperations();
  const { data: plans } = await supabase
    .from("care_plans")
    .select("id, title, payment_status, amount_naira, sessions_purchased, patients(id, rm_id, first_name, last_name)")
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Payments</h1>
          <p className="muted">Package payment status only — not a ledger.</p>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      {ok === "payment" ? <div className="ok">Payment status saved.</div> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Care plan</th>
              <th>Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(plans || []).length ? (
              (plans || []).map((plan) => {
                const patient = Array.isArray(plan.patients) ? plan.patients[0] : plan.patients;
                return (
                  <tr key={plan.id}>
                    <td>
                      <Link href={patient ? `/patients/${patient.id}` : "/patients"}>
                        {patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}
                      </Link>
                      <div className="muted mono">{patient?.rm_id}</div>
                    </td>
                    <td>
                      <Link href={`/care-plans/${plan.id}`}>{plan.title}</Link>
                      <div className="muted">{plan.sessions_purchased} sessions</div>
                    </td>
                    <td>{formatNaira(plan.amount_naira)}</td>
                    <td>{paymentStatusLabel(plan.payment_status)}</td>
                    <td>
                      <form className="role-form" action={updateCarePlanPayment.bind(null, plan.id)}>
                        <input type="hidden" name="amount_naira" value={plan.amount_naira || ""} />
                        <select name="payment_status" defaultValue={plan.payment_status}>
                          <option value="unpaid">Unpaid</option>
                          <option value="partial">Partial</option>
                          <option value="paid">Paid</option>
                        </select>
                        <button className="btn btn-ghost" type="submit">
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="empty">
                  No care plans to take payment against yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
