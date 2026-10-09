import Link from "next/link";
import { createPatient } from "@/app/actions";
import { PatientForm } from "@/components/PatientForm";
import { requireStaff } from "@/lib/auth";
import type { Profile } from "@/lib/types";

export default async function NewPatientPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, isAdmin } = await requireStaff();
  const { data: profiles } = isAdmin
    ? await supabase
        .from("profiles")
        .select("id, full_name, status")
        .order("full_name")
        .returns<Pick<Profile, "id" | "full_name" | "status">[]>()
    : { data: [] as Pick<Profile, "id" | "full_name" | "status">[] };

  const assignable = (profiles || []).filter((row) => row.status !== "disabled");

  return (
    <>
      <p className="crumb">
        <Link href="/patients">Patients</Link> · New patient
      </p>
      <div className="page-head">
        <div>
          <h1>Add Patient</h1>
          <p className="muted">
            {isAdmin
              ? "A Relief Motion ID is assigned automatically for handover."
              : "New records are assigned to you. A Relief Motion ID is created automatically."}
          </p>
        </div>
      </div>
      <PatientForm
        action={createPatient}
        profiles={assignable}
        error={error}
        submitLabel="Save patient"
        includeAssignment={isAdmin}
      />
    </>
  );
}
