"use client";

import { useFormStatus } from "react-dom";
import { ageFromDob } from "@/lib/format";
import type { Profile } from "@/lib/types";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function PatientForm({
  action,
  profiles,
  patient,
  error,
  submitLabel,
  includeAssignment = true
}: {
  action: (formData: FormData) => void | Promise<void>;
  profiles: Pick<Profile, "id" | "full_name">[];
  patient?: {
    first_name: string;
    last_name: string;
    phone: string | null;
    city: string | null;
    address: string | null;
    sex: string | null;
    date_of_birth: string | null;
    condition: string | null;
    status?: string | null;
    assigned_to: string | null;
    emergency_name: string | null;
    emergency_phone: string | null;
    referral_source: string | null;
    medical_history: string | null;
  };
  error?: string;
  submitLabel: string;
  includeAssignment?: boolean;
}) {
  const age = patient ? ageFromDob(patient.date_of_birth) : null;
  return (
    <form className="panel" action={action}>
      {error ? <div className="error">{error}</div> : null}
      <div className="grid-2">
        <div>
          <label htmlFor="first_name">First name</label>
          <input id="first_name" name="first_name" required defaultValue={patient?.first_name} />
        </div>
        <div>
          <label htmlFor="last_name">Last name</label>
          <input id="last_name" name="last_name" required defaultValue={patient?.last_name} />
        </div>
        <div>
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" defaultValue={patient?.phone || ""} />
        </div>
        <div>
          <label htmlFor="age">Age</label>
          <input
            id="age"
            name="age"
            type="number"
            inputMode="numeric"
            min={0}
            max={120}
            step={1}
            placeholder="Years"
            defaultValue={age ?? ""}
          />
        </div>
        <div>
          <label htmlFor="sex">Sex</label>
          <select id="sex" name="sex" defaultValue={patient?.sex || ""}>
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={patient?.status || "active"}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label htmlFor="city">City</label>
          <input id="city" name="city" defaultValue={patient?.city || ""} />
        </div>
        <div>
          <label htmlFor="address">Address</label>
          <input id="address" name="address" defaultValue={patient?.address || ""} />
        </div>
        <div>
          <label htmlFor="condition">Primary condition</label>
          <input id="condition" name="condition" defaultValue={patient?.condition || ""} />
        </div>
        {includeAssignment !== false ? (
          <div>
            <label htmlFor="assigned_to">Assigned physiotherapist</label>
            <select id="assigned_to" name="assigned_to" defaultValue={patient?.assigned_to || ""}>
              <option value="">Unassigned</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || "Staff"}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <label htmlFor="emergency_name">Emergency contact</label>
          <input id="emergency_name" name="emergency_name" defaultValue={patient?.emergency_name || ""} />
        </div>
        <div>
          <label htmlFor="emergency_phone">Emergency phone</label>
          <input id="emergency_phone" name="emergency_phone" defaultValue={patient?.emergency_phone || ""} />
        </div>
        <div>
          <label htmlFor="referral_source">Referral source</label>
          <input id="referral_source" name="referral_source" defaultValue={patient?.referral_source || ""} />
        </div>
      </div>
      <label htmlFor="medical_history">Medical history</label>
      <textarea id="medical_history" name="medical_history" defaultValue={patient?.medical_history || ""} />
      <SubmitButton label={submitLabel} />
    </form>
  );
}
