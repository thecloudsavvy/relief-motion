"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requirePatientAccess, requireStaff } from "@/lib/auth";
import { lagosStamp } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

function str(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

function nullable(form: FormData, key: string) {
  return str(form, key) || null;
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function logAudit(action: string, patientId?: string, detail?: string) {
  await writeAudit({ action, patientId, detail });
}

export async function updateOwnName(formData: FormData) {
  const { supabase, user } = await requireStaff();
  const full_name = str(formData, "full_name");
  if (!full_name) redirect("/settings?error=Name is required");
  const { error } = await supabase.from("profiles").update({ full_name }).eq("id", user.id);
  if (error) redirect("/settings?error=" + encodeURIComponent(error.message));
  revalidatePath("/");
  redirect("/settings?ok=1");
}

export async function createPatient(formData: FormData) {
  const { supabase, user, isAdmin } = await requireStaff();
  const first_name = str(formData, "first_name");
  const last_name = str(formData, "last_name");
  if (!first_name || !last_name) {
    redirect("/patients/new?error=Name is required");
  }

  const payload = {
    first_name,
    last_name,
    phone: nullable(formData, "phone"),
    city: nullable(formData, "city"),
    address: nullable(formData, "address"),
    sex: nullable(formData, "sex"),
    date_of_birth: nullable(formData, "date_of_birth"),
    condition: nullable(formData, "condition"),
    status: str(formData, "status") === "inactive" ? "inactive" : "active",
    assigned_to: isAdmin ? nullable(formData, "assigned_to") : user.id,
    emergency_name: nullable(formData, "emergency_name"),
    emergency_phone: nullable(formData, "emergency_phone"),
    referral_source: nullable(formData, "referral_source"),
    medical_history: nullable(formData, "medical_history"),
    created_by: user.id
  };

  const { data, error } = await supabase.from("patients").insert(payload).select("id, rm_id").single();
  if (error || !data) {
    redirect("/patients/new?error=" + encodeURIComponent(error?.message || "Could not create patient"));
  }

  await writeAudit({
    action: "created_patient",
    patientId: data.id,
    detail: data.rm_id
  });
  revalidatePath("/patients");
  revalidatePath("/");
  redirect(`/patients/${data.id}`);
}

export async function updatePatient(patientId: string, formData: FormData) {
  const { supabase } = await requirePatientAccess(patientId);
  const first_name = str(formData, "first_name");
  const last_name = str(formData, "last_name");
  if (!first_name || !last_name) {
    redirect(`/patients/${patientId}/edit?error=Name is required`);
  }

  const { error } = await supabase
    .from("patients")
    .update({
      first_name,
      last_name,
      phone: nullable(formData, "phone"),
      city: nullable(formData, "city"),
      address: nullable(formData, "address"),
      sex: nullable(formData, "sex"),
      date_of_birth: nullable(formData, "date_of_birth"),
      condition: nullable(formData, "condition"),
      status: str(formData, "status") === "inactive" ? "inactive" : "active",
      emergency_name: nullable(formData, "emergency_name"),
      emergency_phone: nullable(formData, "emergency_phone"),
      referral_source: nullable(formData, "referral_source"),
      medical_history: nullable(formData, "medical_history")
    })
    .eq("id", patientId);

  if (error) {
    redirect(`/patients/${patientId}/edit?error=` + encodeURIComponent(error.message));
  }

  await writeAudit({ action: "updated_patient", patientId });
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/patients");
  redirect(`/patients/${patientId}`);
}

export async function assignClinician(patientId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const assigned_to = nullable(formData, "assigned_to");
  const { error } = await supabase.from("patients").update({ assigned_to }).eq("id", patientId);
  if (error) {
    redirect(`/patients/${patientId}?error=` + encodeURIComponent(error.message));
  }
  await writeAudit({ action: "assigned_clinician", patientId });
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/patients");
  revalidatePath("/providers");
  redirect(`/patients/${patientId}`);
}

function visitFields(formData: FormData) {
  const subjective = nullable(formData, "subjective");
  const treatment = nullable(formData, "treatment");
  const plan = nullable(formData, "plan");
  return {
    visit_type: str(formData, "visit_type") === "online" ? "online" : "home",
    status: str(formData, "intent") === "draft" ? "draft" : "signed",
    subjective,
    objective: nullable(formData, "objective"),
    assessment: nullable(formData, "assessment"),
    treatment,
    patient_response: nullable(formData, "patient_response"),
    plan,
    additional_notes: nullable(formData, "additional_notes"),
    findings: subjective
  };
}

export async function addVisit(patientId: string, formData: FormData) {
  const { supabase, user } = await requirePatientAccess(patientId);
  const fields = { ...visitFields(formData), ...lagosStamp() };
  const { data, error } = await supabase
    .from("visits")
    .insert({
      patient_id: patientId,
      clinician_id: user.id,
      ...fields
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/patients/${patientId}/sessions/new?error=` + encodeURIComponent(error.message));
  }

  await writeAudit({
    action: fields.status === "draft" ? "saved_draft" : "signed_note",
    patientId,
    visitId: data?.id,
    detail: fields.visit_type
  });
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/sessions");
  revalidatePath("/");
  redirect(`/patients/${patientId}?tab=timeline`);
}

export async function updateVisit(patientId: string, visitId: string, formData: FormData) {
  const { supabase } = await requirePatientAccess(patientId);
  const fields = visitFields(formData);
  const { error } = await supabase.from("visits").update(fields).eq("id", visitId).eq("status", "draft");
  if (error) {
    redirect(`/patients/${patientId}/sessions/${visitId}?error=` + encodeURIComponent(error.message));
  }
  await writeAudit({
    action: fields.status === "draft" ? "saved_draft" : "signed_note",
    patientId,
    visitId,
    detail: fields.visit_type
  });
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/sessions");
  revalidatePath("/");
  redirect(`/patients/${patientId}?tab=notes`);
}

export async function saveDocument(input: {
  patientId: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const { supabase, user } = await requirePatientAccess(input.patientId);
  const { error } = await supabase.from("patient_documents").insert({
    patient_id: input.patientId,
    uploaded_by: user.id,
    filename: input.filename,
    storage_path: input.storagePath,
    mime_type: input.mimeType || null,
    size_bytes: input.sizeBytes || null
  });
  if (error) {
    return { error: error.message };
  }
  await writeAudit({
    action: "uploaded_document",
    patientId: input.patientId,
    detail: input.filename
  });
  revalidatePath(`/patients/${input.patientId}`);
  return { error: null };
}
