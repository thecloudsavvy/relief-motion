import Link from "next/link";
import { createBooking } from "@/app/actions";
import { requireOperations } from "@/lib/auth";
import { nextOpenSlot } from "@/lib/care";
import { lagosStamp } from "@/lib/format";
import type { CareSession, Profile } from "@/lib/types";

export default async function NewBookingPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; patient?: string }>;
}) {
  const { error, patient: patientId } = await searchParams;
  const { supabase } = await requireOperations();
  const today = lagosStamp().visit_at;
  const [{ data: patients }, { data: plans }, { data: clinicians }] = await Promise.all([
    supabase.from("patients").select("id, rm_id, first_name, last_name, city").eq("status", "active").order("last_name"),
    supabase
      .from("care_plans")
      .select("id, title, patient_id, sessions_purchased, status, sessions(id, session_number, status, counts_against_package)")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, role, status")
      .eq("role", "physiotherapist")
      .neq("status", "disabled")
      .order("full_name")
      .returns<Profile[]>()
  ]);

  const openPlans = (plans || []).filter((plan) => nextOpenSlot((plan.sessions || []) as CareSession[]));

  return (
    <>
      <p className="crumb">
        <Link href="/bookings">Bookings</Link> · New booking
      </p>
      <div className="page-head">
        <div>
          <h1>New booking</h1>
          <p className="muted">Schedule an existing care-plan slot, or create a one-session booking.</p>
        </div>
      </div>
      <form className="panel" action={createBooking}>
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
            <label htmlFor="care_plan_id">Care plan</label>
            <select id="care_plan_id" name="care_plan_id" defaultValue="">
              <option value="">New 1-session booking</option>
              {openPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title} · {plan.sessions_purchased} sessions
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="title">If new: service title</label>
            <input id="title" name="title" placeholder="Home Physiotherapy" />
          </div>
          <div>
            <label htmlFor="clinician_id">Physiotherapist</label>
            <select id="clinician_id" name="clinician_id" defaultValue="">
              <option value="">Assigned PT</option>
              {(clinicians || []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.full_name || "Staff"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="scheduled_date">Date</label>
            <input id="scheduled_date" name="scheduled_date" type="date" required defaultValue={today} />
          </div>
          <div>
            <label htmlFor="scheduled_time">Time</label>
            <input id="scheduled_time" name="scheduled_time" type="time" defaultValue="09:00" />
          </div>
          <div>
            <label htmlFor="visit_type">Type</label>
            <select id="visit_type" name="visit_type" defaultValue="home">
              <option value="home">Home visit</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div>
            <label htmlFor="location">Location</label>
            <input id="location" name="location" placeholder="Ikeja" />
          </div>
        </div>
        <label className="muted" style={{ display: "flex", gap: "0.4rem", alignItems: "center", margin: "0.8rem 0" }}>
          <input type="checkbox" name="confirm" value="1" style={{ width: "auto" }} />
          Mark as confirmed with the patient
        </label>
        <button className="btn" type="submit">
          Save booking
        </button>
      </form>
    </>
  );
}
