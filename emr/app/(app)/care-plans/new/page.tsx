import Link from "next/link";
import { createCarePlan } from "@/app/actions";
import { requireOperations } from "@/lib/auth";
import { lagosStamp } from "@/lib/format";
import type { Profile } from "@/lib/types";

export default async function NewCarePlanPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; patient?: string }>;
}) {
  const { error, patient: patientId } = await searchParams;
  const { supabase } = await requireOperations();
  const today = lagosStamp().visit_at;
  const [{ data: patients }, { data: clinicians }] = await Promise.all([
    supabase.from("patients").select("id, rm_id, first_name, last_name, condition").eq("status", "active").order("last_name"),
    supabase
      .from("profiles")
      .select("id, full_name, role, status")
      .eq("role", "physiotherapist")
      .neq("status", "disabled")
      .order("full_name")
      .returns<Profile[]>()
  ]);

  const selected = (patients || []).find((row) => row.id === patientId);

  return (
    <>
      <p className="crumb">
        <Link href="/care-plans">Care Plans</Link> · New
      </p>
      <div className="page-head">
        <div>
          <h1>New care plan</h1>
          <p className="muted">Creates the package and the individual session slots. Do not hard-code six — enter what was purchased.</p>
        </div>
      </div>
      <form className="panel" action={createCarePlan}>
        {error ? <div className="error">{error}</div> : null}
        <div className="grid-2">
          <div>
            <label htmlFor="patient_id">Patient</label>
            <select id="patient_id" name="patient_id" required defaultValue={patientId || ""}>
              <option value="">Choose a patient</option>
              {(patients || []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.rm_id} · {row.first_name} {row.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="title">Plan title</label>
            <input id="title" name="title" required placeholder="Back Pain Rehabilitation" defaultValue={selected?.condition || ""} />
          </div>
          <div>
            <label htmlFor="service_type">Service</label>
            <select id="service_type" name="service_type" defaultValue="home">
              <option value="home">Home Physiotherapy</option>
              <option value="online">Online consultation</option>
            </select>
          </div>
          <div>
            <label htmlFor="condition">Condition / reason</label>
            <input id="condition" name="condition" placeholder="Back pain" defaultValue={selected?.condition || ""} />
          </div>
          <div>
            <label htmlFor="sessions_purchased">Sessions purchased</label>
            <input id="sessions_purchased" name="sessions_purchased" type="number" min={1} step={1} required defaultValue={6} />
          </div>
          <div>
            <label htmlFor="assigned_to">Assigned physiotherapist</label>
            <select id="assigned_to" name="assigned_to" defaultValue="">
              <option value="">Unassigned</option>
              {(clinicians || []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.full_name || "Staff"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="start_date">Start date</label>
            <input id="start_date" name="start_date" type="date" defaultValue={today} />
          </div>
          <div>
            <label htmlFor="first_session_date">First session date (optional)</label>
            <input id="first_session_date" name="first_session_date" type="date" />
          </div>
          <div>
            <label htmlFor="first_session_time">First session time</label>
            <input id="first_session_time" name="first_session_time" type="time" />
          </div>
          <div>
            <label htmlFor="payment_status">Payment</label>
            <select id="payment_status" name="payment_status" defaultValue="unpaid">
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label htmlFor="amount_naira">Amount (naira, optional)</label>
            <input id="amount_naira" name="amount_naira" type="number" min={0} step="1000" placeholder="120000" />
          </div>
        </div>
        <button className="btn" type="submit">
          Create care plan
        </button>
      </form>
    </>
  );
}
