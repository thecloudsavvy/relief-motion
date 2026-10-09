import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { AppTopBrand } from "@/components/AppTopBrand";
import { HeaderTools } from "@/components/HeaderTools";
import { TopSearch } from "@/components/TopSearch";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { Profile } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, status")
    .eq("id", user.id)
    .single<Profile>();

  if (profile?.status === "disabled") {
    await supabase.auth.signOut();
    redirect("/login?error=" + encodeURIComponent("This staff account has been disabled."));
  }

  const { data: draftRows } = await supabase
    .from("visits")
    .select("id, visit_at, patient_id, patients(rm_id, first_name, last_name)")
    .eq("status", "draft")
    .eq("clinician_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const name = profile?.full_name || user.email || "Staff";
  const role = profile?.role === "admin" ? "Admin" : "Physiotherapist";
  const notices = (draftRows || []).map((row) => {
    const patient = Array.isArray(row.patients) ? row.patients[0] : row.patients;
    const who = patient ? `${patient.first_name} ${patient.last_name}` : "Patient";
    return {
      id: row.id,
      href: `/patients/${row.patient_id}/sessions/${row.id}`,
      title: "Draft note to finish",
      detail: `${patient?.rm_id || "Record"} · ${who} · ${formatDate(row.visit_at)}`
    };
  });

  return (
    <div className="app-shell">
      <AppNav name={name} role={profile?.role || "physiotherapist"} />
      <div className="app-body">
        <header className="app-top">
          <AppTopBrand />
          <TopSearch />
          <HeaderTools name={name} role={role} notices={notices} />
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
