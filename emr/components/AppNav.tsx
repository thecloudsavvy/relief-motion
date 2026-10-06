"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";
import {
  Avatar,
  IconAudit,
  IconHome,
  IconLogout,
  IconPatients,
  IconProviders,
  IconSessions,
  IconSettings
} from "@/components/ui";
import { initials } from "@/lib/format";

const BASE_NAV = [
  { href: "/", label: "Dashboard", icon: IconHome },
  { href: "/patients", label: "Patients", icon: IconPatients },
  { href: "/sessions", label: "Sessions", icon: IconSessions }
];

const ADMIN_NAV = [
  { href: "/providers", label: "Providers", icon: IconProviders },
  { href: "/audit", label: "Audit Log", icon: IconAudit }
];

const TAIL_NAV = [{ href: "/settings", label: "Settings", icon: IconSettings }];

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
  const nav = [...BASE_NAV, ...(isAdmin ? ADMIN_NAV : []), ...TAIL_NAV];

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/logo-mark.png" alt="" width={36} height={36} />
        <div>
          <strong>Relief Motion</strong>
          <span>PHYSIOTHERAPY</span>
        </div>
      </div>
      <nav>
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} className={active ? "nav-item active" : "nav-item"} href={item.href}>
              <Icon />
              {item.label}
            </Link>
          );
        })}
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
