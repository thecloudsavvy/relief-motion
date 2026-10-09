"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authParamsFromHref, claimAuthFromHref } from "@/lib/supabase/claim-session";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const href = window.location.href;
    const params = authParamsFromHref(href);
    const supabase = createClient();

    void (async () => {
      const { error: claimError } = await claimAuthFromHref(supabase, href);
      if (claimError) {
        setError(claimError.message);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("This invite link is missing or has already been used. Ask an admin to send a new one.");
        return;
      }
      router.replace(params.isPasswordFlow || params.type === "invite" || params.type === "recovery" ? "/login?set=1" : "/");
    })();
  }, [router]);

  return (
    <div className="auth-shell" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <p className={error ? "error" : "muted"}>{error || "Opening your staff invite…"}</p>
    </div>
  );
}
