"use client";

import { useFormStatus } from "react-dom";
import { deleteInactivePatient } from "@/app/actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-ghost" type="submit" disabled={pending}>
      {pending ? "Deleting…" : label}
    </button>
  );
}

export function DeletePatientButton({
  patientId,
  name,
  rmId
}: {
  patientId: string;
  name: string;
  rmId: string;
}) {
  return (
    <form
      action={deleteInactivePatient}
      onSubmit={(event) => {
        if (
          !confirm(
            `Delete ${name} (${rmId})? This removes the chart, session notes, and files. It cannot be undone.`
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="patient_id" value={patientId} />
      <Submit label="Delete chart" />
    </form>
  );
}
