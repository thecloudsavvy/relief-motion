import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asRole, type Patient, type Profile, type Role } from "@/lib/types";

export type Staff = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string };
  profile: Profile | null;
  role: Role;
  isAdmin: boolean;
  isSupport: boolean;
  canCreatePatients: boolean;
};

export async function requireStaff(): Promise<Staff> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, created_at")
    .eq("id", user.id)
    .single<Profile>();

  if (profile?.status === "disabled") {
    await supabase.auth.signOut();
    redirect("/login?error=" + encodeURIComponent("This staff account has been disabled."));
  }

  const role = asRole(profile?.role);
  const isAdmin = role === "admin";
  const isSupport = role === "support";
  return {
    supabase,
    user,
    profile,
    role,
    isAdmin,
    isSupport,
    canCreatePatients: isAdmin || isSupport
  };
}

export async function requireAdmin() {
  const staff = await requireStaff();
  if (!staff.isAdmin) redirect("/");
  return staff;
}

export async function requireCreatePatient() {
  const staff = await requireStaff();
  if (!staff.canCreatePatients) redirect("/patients");
  return staff;
}

export function canAccessPatient(assignedTo: string | null, staff: Staff, createdBy?: string | null) {
  if (staff.isAdmin || assignedTo === staff.user.id) return true;
  return staff.isSupport && createdBy === staff.user.id;
}

export async function requirePatientAccess(patientId: string) {
  const staff = await requireStaff();
  const { data: patient } = await staff.supabase.from("patients").select("*").eq("id", patientId).single<Patient>();
  if (!patient || !canAccessPatient(patient.assigned_to, staff, patient.created_by)) notFound();
  return { ...staff, patient };
}
