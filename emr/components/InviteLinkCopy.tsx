"use client";

import { useState } from "react";

export function InviteLinkCopy({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="ok" style={{ display: "grid", gap: "0.6rem" }}>
      <p>
        The staff profile is ready, but the invite email could not be sent. Copy this link and open it in an incognito
        window so they can set a password. Do not use the browser where you are already signed in as admin.
      </p>
      <input readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
      <div>
        <button className="btn btn-ghost" type="button" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
