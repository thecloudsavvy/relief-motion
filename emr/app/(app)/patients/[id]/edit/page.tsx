import Link from "next/link";
import { updatePatient } from "@/app/actions";
import { PatientForm } from "@/components/PatientForm";
import { requirePatientAccess } from "@/lib/auth";
import type { Profile } from "@/lib/types";

export default async function EditPatientPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, patient } = await requirePatientAccess(id);
  const { data: profiles } = await supabase.from("profiles").select("id, full_name");

  return (
    <>
      <p className="crumb">
        <Link href={`/patients/${id}`}>Back to {patient.rm_id}</Link>
      </p>
      <h1>Edit patient</h1>
      <PatientForm
        action={updatePatient.bind(null, id)}
        profiles={(profiles as Pick<Profile, "id" | "full_name">[]) || []}
        patient={patient}
        error={error}
        submitLabel="Save changes"
        includeAssignment={false}
      />
    </>
  );
}
