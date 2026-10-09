"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { InviteLinkCopy } from "@/components/InviteLinkCopy";

export function QueryFlash({ inviteLink = "" }: { inviteLink?: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [ok] = useState(params.get("ok"));
  const [error] = useState(params.get("error"));

  useEffect(() => {
    if (!params.get("ok") && !params.get("error")) return;
    const next = new URLSearchParams(params.toString());
    next.delete("ok");
    next.delete("error");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  if (!ok && !error) return null;

  return (
    <div style={{ marginBottom: "1rem" }}>
      {error ? <div className="error">{error}</div> : null}
      {ok === "invite" ? (
        <div className="ok">Invite sent. They will get an email to set a password and sign in.</div>
      ) : null}
      {ok === "link" && inviteLink ? <InviteLinkCopy link={inviteLink} /> : null}
      {ok === "name" ? <div className="ok">Name saved.</div> : null}
      {ok === "role" ? <div className="ok">Staff access updated.</div> : null}
      {ok === "deleted" ? <div className="ok">Staff account deleted. Session notes were kept.</div> : null}
      {ok === "reset" ? (
        <div className="ok">If that email is on the staff list, a reset link is on its way.</div>
      ) : null}
    </div>
  );
}
