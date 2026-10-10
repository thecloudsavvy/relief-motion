"use client";

import { usePathname } from "next/navigation";

function titleFromPath(pathname: string) {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/patients/new")) return "New patient";
  if (pathname.includes("/sessions/new")) return "Log visit";
  if (pathname.includes("/sessions/")) return "Session note";
  if (pathname.includes("/patients/") && pathname.endsWith("/edit")) return "Edit patient";
  if (pathname.startsWith("/patients/")) return "Patient";
  if (pathname.startsWith("/patients")) return "Patients";
  if (pathname.startsWith("/sessions")) return "Sessions";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/providers")) return "Providers";
  if (pathname.startsWith("/audit")) return "Audit";
  return "Relief Motion";
}

export function AppTopBrand() {
  const pathname = usePathname();

  return (
    <div className="app-top-brand">
      <img className="app-top-mark" src="/logo-mark.png" alt="" width={32} height={32} />
      {pathname === "/" ? null : <span className="app-top-title">{titleFromPath(pathname)}</span>}
    </div>
  );
}
