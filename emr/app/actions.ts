"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requirePatientAccess, requireStaff } from "@/lib/auth";
import { lagosStamp } from "@/lib/format";
import { sendStaffInviteEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function str(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

function nullable(form: FormData, key: string) {
  return str(form, key) || null;
}

function authErrorText(error: unknown, fallback: string) {
  if (!error) return fallback;
  if (typeof error === "string" && error.trim() && error.trim() !== "{}") return error.trim();
  if (typeof error === "object") {
    const row = error as {
      message?: unknown;
      code?: unknown;
      status?: unknown;
      error?: unknown;
      error_description?: unknown;
    };
    const parts = [row.message, row.error_description, row.error, row.code]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value && value !== "{}");
    if (parts.length) return parts.join(" — ");
    if (row.status) return `${fallback} (${row.status})`;
  }
  return fallback;
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
  revalidatePath("/settings");
  redirect("/settings?ok=name");
}

export async function requestPasswordReset() {
  const { supabase } = await requireStaff();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const email = user?.email;
  if (!email) redirect("/settings?tab=security&error=No email on this account");

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") || "http";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${proto}://${host}/auth/callback`
  });
  if (error) {
    redirect("/settings?tab=security&error=" + encodeURIComponent(error.message));
  }
  redirect("/settings?tab=security&ok=reset");
}

export async function updateStaffRole(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const staffId = str(formData, "staff_id");
  const role = str(formData, "role") === "admin" ? "admin" : "physiotherapist";
  const status = str(formData, "status") === "disabled" ? "disabled" : "active";
  if (!staffId) redirect("/settings?tab=roles&error=Choose a staff member");
  if (staffId === user.id) redirect("/settings?tab=roles&error=You cannot change your own access");

  const { data: target } = await supabase.from("profiles").select("id, role, status").eq("id", staffId).single();
  if (!target) redirect("/settings?tab=roles&error=Staff member not found");

  const wasActiveAdmin = target.role === "admin" && target.status !== "disabled";
  const willBeActiveAdmin = role === "admin" && status === "active";
  if (wasActiveAdmin && !willBeActiveAdmin) {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin")
      .neq("status", "disabled");
    if ((count || 0) <= 1) {
      redirect("/settings?tab=roles&error=Keep at least one active administrator");
    }
  }

  const { error } = await supabase.from("profiles").update({ role, status }).eq("id", staffId);
  if (error) {
    redirect("/settings?tab=roles&error=" + encodeURIComponent(error.message));
  }

  const admin = createAdminClient();
  if (admin) {
    await admin.auth.admin.updateUserById(staffId, {
      ban_duration: status === "disabled" ? "876000h" : "none"
    });
  }

  await writeAudit({
    action:
      status === "disabled" && target.status !== "disabled"
        ? "disabled_staff"
        : status === "active" && target.status === "disabled"
          ? "enabled_staff"
          : "updated_staff_role",
    detail: `${role}:${status}`
  });
  revalidatePath("/settings");
  revalidatePath("/providers");
  redirect("/settings?tab=roles&ok=role");
}

export async function deleteStaff(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const staffId = str(formData, "staff_id");
  if (!staffId) redirect("/settings?tab=roles&error=Choose a staff member");
  if (staffId === user.id) redirect("/settings?tab=roles&error=You cannot delete your own account");

  const { data: target } = await supabase
    .from("profiles")
    .select("id, full_name, role, status")
    .eq("id", staffId)
    .single();
  if (!target) redirect("/settings?tab=roles&error=Staff member not found");
  if (target.status !== "disabled") {
    redirect("/settings?tab=roles&error=Disable this account before deleting it");
  }

  const admin = createAdminClient();
  if (!admin) {
    redirect("/settings?tab=roles&error=Missing server key. Add SUPABASE_SERVICE_ROLE_KEY and restart.");
  }

  const name = target.full_name || "Unnamed staff";
  await admin.from("patients").update({ assigned_to: null }).eq("assigned_to", staffId);
  await admin.from("patients").update({ created_by: null }).eq("created_by", staffId);
  await admin.from("visits").update({ clinician_name: name }).eq("clinician_id", staffId);
  const { error: visitError } = await admin.from("visits").update({ clinician_id: null }).eq("clinician_id", staffId);
  if (visitError) {
    redirect(
      "/settings?tab=roles&error=" +
        encodeURIComponent(
          "Run schema.sql in the Supabase SQL editor so session notes can stay, then try delete again."
        )
    );
  }
  await admin.from("patient_documents").update({ uploaded_by: null }).eq("uploaded_by", staffId);
  await admin.from("audit_events").update({ actor_id: null }).eq("actor_id", staffId);

  const { error } = await admin.auth.admin.deleteUser(staffId);
  if (error) {
    const { error: profileError } = await admin.from("profiles").delete().eq("id", staffId);
    if (profileError) {
      redirect("/settings?tab=roles&error=" + encodeURIComponent(authErrorText(error, "Could not delete this account")));
    }
  }

  await writeAudit({ action: "deleted_staff", detail: name });
  revalidatePath("/settings");
  revalidatePath("/providers");
  revalidatePath("/patients");
  revalidatePath("/sessions");
  revalidatePath("/");
  redirect("/settings?tab=roles&ok=deleted");
}

export async function invitePhysiotherapist(formData: FormData) {
  await requireAdmin();
  const full_name = str(formData, "full_name");
  const email = str(formData, "email").toLowerCase();
  if (!full_name || !email || !email.includes("@")) {
    redirect("/settings?tab=invite&error=Name and a valid work email are required");
  }

  const admin = createAdminClient();
  if (!admin) {
    redirect(
      "/settings?tab=invite&error=" +
        encodeURIComponent("Add SUPABASE_SERVICE_ROLE_KEY to emr/.env.local, then restart the app.")
    );
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") || "http";
  const redirectTo = `${proto}://${host}/auth/callback`;

  let link = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { full_name }, redirectTo }
  });
  if (link.error) {
    link = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo }
    });
  }
  if (link.error || !link.data?.properties?.action_link) {
    redirect(
      "/settings?tab=invite&error=" +
        encodeURIComponent(authErrorText(link.error, "Could not create the invite."))
    );
  }

  const userId = link.data.user?.id;
  if (userId) {
    await admin.from("profiles").upsert({
      id: userId,
      full_name,
      role: "physiotherapist",
      status: "active"
    });
  }

  const sent = await sendStaffInviteEmail(email, link.data.properties.action_link);
  await writeAudit({ action: "invited_physiotherapist", detail: email });
  revalidatePath("/settings");
  revalidatePath("/providers");

  if (!sent.ok) {
    const jar = await cookies();
    jar.set("rm_invite_link", link.data.properties.action_link, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600
    });
    redirect("/settings?tab=invite&ok=link&error=" + encodeURIComponent(sent.error));
  }

  redirect("/settings?tab=invite&ok=invite");
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
  const { supabase, user, profile } = await requirePatientAccess(patientId);
  const fields = { ...visitFields(formData), ...lagosStamp() };
  const row = {
    patient_id: patientId,
    clinician_id: user.id,
    clinician_name: profile?.full_name || null,
    ...fields
  };
  let { data, error } = await supabase.from("visits").insert(row).select("id").single();
  if (error && /clinician_name/i.test(error.message)) {
    const { clinician_name: _ignored, ...withoutName } = row;
    ({ data, error } = await supabase.from("visits").insert(withoutName).select("id").single());
  }

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
