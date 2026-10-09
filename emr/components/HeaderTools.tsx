"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions";
import { Avatar, IconBell, IconLogout, IconSettings } from "@/components/ui";
import { initials } from "@/lib/format";

export type HeaderNotice = {
  id: string;
  href: string;
  title: string;
  detail: string;
};

export function HeaderTools({
  name,
  role,
  notices
}: {
  name: string;
  role: string;
  notices: HeaderNotice[];
}) {
  const [open, setOpen] = useState<"bell" | "account" | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!wrap.current?.contains(event.target as Node)) setOpen(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="header-tools" ref={wrap}>
      <div className="menu">
        <button
          className="bell"
          type="button"
          aria-label="Notifications"
          aria-expanded={open === "bell"}
          onClick={() => setOpen(open === "bell" ? null : "bell")}
        >
          <IconBell />
          {notices.length ? <span className="bell-dot">{notices.length}</span> : null}
        </button>
        {open === "bell" ? (
          <div className="menu-panel menu-panel-bell">
            <p className="menu-heading">Notifications</p>
            {notices.length ? (
              notices.map((item) => (
                <Link key={item.id} className="menu-item" href={item.href} onClick={() => setOpen(null)}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </Link>
              ))
            ) : (
              <p className="menu-empty">No notifications. Draft notes to finish will appear here.</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="menu">
        <button
          className="top-user"
          type="button"
          aria-expanded={open === "account"}
          onClick={() => setOpen(open === "account" ? null : "account")}
        >
          <Avatar label={initials(name)} size="sm" />
          <div>
            <strong>{name}</strong>
            <span>{role}</span>
          </div>
        </button>
        {open === "account" ? (
          <div className="menu-panel menu-panel-account">
            <Link className="menu-item" href="/settings" onClick={() => setOpen(null)}>
              <IconSettings />
              Settings
            </Link>
            <form action={logout}>
              <button className="menu-item menu-logout" type="submit">
                <IconLogout />
                Log out
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
