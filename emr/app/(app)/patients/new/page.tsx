import Link from "next/link";
import { createPatient } from "@/app/actions";
import { PatientForm } from "@/components/PatientForm";
import { requireCreatePatient } from "@/lib/auth";
import type { Profile } from "@/lib/types";

export default async function NewPatientPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase } = await requireCreatePatient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, status")
    .order("full_name")
    .returns<Pick<Profile, "id" | "full_name" | "role" | "status">[]>();

  const assignable = (profiles || []).filter(
    (row) => row.status !== "disabled" && row.role !== "support"
  );

  return (
    <>
      <p className="crumb">
        <Link href="/patients">Patients</Link> · New patient
      </p>
      <div className="page-head">
        <div>
          <h1>Add Patient</h1>
          <p className="muted">
            Clinic intake only. Assign the physiotherapist who will own this chart.
          </p>
        </div>
      </div>
      <PatientForm
        action={createPatient}
        profiles={assignable}
        error={error}
        submitLabel="Save patient"
        includeAssignment
      />
    </>
  );
}
