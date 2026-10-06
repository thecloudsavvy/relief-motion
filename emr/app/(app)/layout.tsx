import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { Avatar, IconBell, IconSearch } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/format";
import type { Profile } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single<Profile>();

  const name = profile?.full_name || user.email || "Staff";
  const role = profile?.role === "admin" ? "Admin" : "Physiotherapist";

  return (
    <div className="app-shell">
      <AppNav name={name} role={profile?.role || "physiotherapist"} />
      <div className="app-body">
        <header className="app-top">
          <form className="top-search" action="/patients">
            <IconSearch />
            <input name="q" placeholder="Search patients by name, ID or phone…" />
          </form>
          <button className="bell" type="button" aria-label="Notifications">
            <IconBell />
          </button>
          <Link className="top-user" href="/settings">
            <Avatar label={initials(name)} size="sm" />
            <div>
              <strong>{name}</strong>
              <span>{role}</span>
            </div>
          </Link>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
