import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Patient, Profile, Role } from "@/lib/types";

export type Staff = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string };
  profile: Profile | null;
  role: Role;
  isAdmin: boolean;
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

  const role: Role = profile?.role === "admin" ? "admin" : "physiotherapist";
  return { supabase, user, profile, role, isAdmin: role === "admin" };
}

export async function requireAdmin() {
  const staff = await requireStaff();
  if (!staff.isAdmin) redirect("/");
  return staff;
}

export function canAccessPatient(assignedTo: string | null, staff: Staff) {
  return staff.isAdmin || assignedTo === staff.user.id;
}

export async function requirePatientAccess(patientId: string) {
  const staff = await requireStaff();
  const { data: patient } = await staff.supabase.from("patients").select("*").eq("id", patientId).single<Patient>();
  if (!patient || !canAccessPatient(patient.assigned_to, staff)) notFound();
  return { ...staff, patient };
}
