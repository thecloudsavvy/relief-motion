"use client";

import { deleteStaff } from "@/app/actions";

export function DeleteStaffButton({ staffId, name }: { staffId: string; name: string }) {
  return (
    <form
      action={deleteStaff}
      onSubmit={(event) => {
        if (
          !confirm(
            `Delete ${name}? They will be removed from staff. Session notes stay on the patient chart, and assigned patients become unassigned.`
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="staff_id" value={staffId} />
      <button className="btn btn-ghost" type="submit">
        Delete
      </button>
    </form>
  );
}
