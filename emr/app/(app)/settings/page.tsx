import { logout, updateOwnName } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single<Pick<Profile, "full_name" | "role">>();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">Your staff profile. Password changes stay in the email invite from Supabase.</p>
        </div>
      </div>
      <form className="panel" action={updateOwnName} style={{ maxWidth: "32rem" }}>
        {error ? <div className="error">{error}</div> : null}
        {ok ? <div className="ok">Name saved.</div> : null}
        <label htmlFor="full_name">Display name</label>
        <input id="full_name" name="full_name" defaultValue={profile?.full_name || ""} required />
        <label>Email</label>
        <input value={user.email || ""} disabled />
        <label>Role</label>
        <input value={profile?.role === "admin" ? "Admin" : "Physiotherapist"} disabled />
        <button className="btn" type="submit">
          Save name
        </button>
      </form>
      <form action={logout} style={{ marginTop: "1rem" }}>
        <button className="btn btn-ghost" type="submit">
          Log out
        </button>
      </form>
    </>
  );
}
