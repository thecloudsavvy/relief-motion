"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/actions";
import {
  Avatar,
  IconAudit,
  IconHome,
  IconLogout,
  IconMore,
  IconPatients,
  IconProviders,
  IconSessions,
  IconSettings
} from "@/components/ui";
import { initials } from "@/lib/format";

const BASE_NAV = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/patients", label: "Patients", icon: IconPatients },
  { href: "/sessions", label: "Sessions", icon: IconSessions }
];

const ADMIN_NAV = [
  { href: "/providers", label: "Providers", icon: IconProviders },
  { href: "/audit", label: "Audit", icon: IconAudit }
];

const TAIL_NAV = [{ href: "/settings", label: "Settings", icon: IconSettings }];

function NavLinks({
  items,
  pathname,
  onNavigate
}: {
  items: typeof BASE_NAV;
  pathname: string;
  onNavigate?: () => void;
}) {
  return items.map((item) => {
    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        className={active ? "nav-item active" : "nav-item"}
        href={item.href}
        onClick={onNavigate}
      >
        <Icon />
        {item.label}
      </Link>
    );
  });
}

export function AppNav({
  name,
  role
}: {
  name: string;
  role: string;
}) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const roleLabel = isAdmin ? "Admin" : "Physiotherapist";
  const desktopNav = [...BASE_NAV, ...(isAdmin ? ADMIN_NAV : []), ...TAIL_NAV];
  const mobilePrimary = isAdmin ? BASE_NAV : [...BASE_NAV, ...TAIL_NAV];
  const mobileMore = isAdmin ? [...ADMIN_NAV, ...TAIL_NAV] : [];
  const moreActive = mobileMore.some((item) => pathname.startsWith(item.href));
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/logo-mark.png" alt="" width={36} height={36} />
        <div>
          <strong>Relief Motion</strong>
          <span>PHYSIOTHERAPY</span>
        </div>
      </div>
      <nav className="nav-desktop">
        <NavLinks items={desktopNav} pathname={pathname} />
      </nav>
      <nav className="nav-mobile">
        <NavLinks items={mobilePrimary} pathname={pathname} />
        {isAdmin ? (
          <div className="nav-more-wrap">
            {moreOpen ? (
              <div className="nav-more">
                <NavLinks items={mobileMore} pathname={pathname} onNavigate={() => setMoreOpen(false)} />
              </div>
            ) : null}
            <button
              className={moreOpen || moreActive ? "nav-item active" : "nav-item"}
              type="button"
              aria-expanded={moreOpen}
              aria-label="More"
              onClick={() => setMoreOpen((open) => !open)}
            >
              <IconMore />
              More
            </button>
          </div>
        ) : null}
      </nav>
      <div className="sidebar-user">
        <Avatar label={initials(name)} />
        <div>
          <strong>{name || "Staff"}</strong>
          <span>{roleLabel}</span>
        </div>
      </div>
      <form action={logout}>
        <button className="nav-item logout" type="submit">
          <IconLogout />
          Log out
        </button>
      </form>
    </aside>
  );
}
