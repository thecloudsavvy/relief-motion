import type { ReactNode } from "react";

export function IconHome() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export function IconPatients() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 11a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 9 11zm7.5 0A3 3 0 1 0 13.5 8a3 3 0 0 0 3 3zM3 19.2C3 16.4 6.1 15 9 15s6 1.4 6 4.2V20H3zm12.2-.2c.4-1.7 2-2.8 4.3-2.8 2.6 0 4.5 1.2 4.5 3.4V20h-8.8z" />
    </svg>
  );
}

export function IconSessions() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h2v2h6V3h2v2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2zm12 8H5v8h14zM5 7v2h14V7z" />
    </svg>
  );
}

export function IconProviders() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4.2 0-8 2-8 5.2V21h16v-1.8C20 16 16.2 14 12 14z" />
    </svg>
  );
}

export function IconAudit() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h8l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm7 1.5V9h4.5zM8 12h8v1.5H8zm0 3.5h8V17H8z" />
    </svg>
  );
}

export function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.2 3h3.6l.4 2.2a6.8 6.8 0 0 1 1.7 1l2.1-.8 1.8 3.1-1.7 1.4a6.7 6.7 0 0 1 0 2.2l1.7 1.4-1.8 3.1-2.1-.8a6.8 6.8 0 0 1-1.7 1L13.8 21h-3.6l-.4-2.2a6.8 6.8 0 0 1-1.7-1l-2.1.8L4.2 15.5l1.7-1.4a6.7 6.7 0 0 1 0-2.2L4.2 8.5 6 5.4l2.1.8a6.8 6.8 0 0 1 1.7-1zm1.8 6.2A2.8 2.8 0 1 0 14.8 12 2.8 2.8 0 0 0 12 9.2z" />
    </svg>
  );
}

export function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 5h8v14h-8v-2h6V7h-6zm-1.3 4.3 1.4-1.4L5.4 11H16v2H5.4l4.7 4.1-1.4 1.4L1.8 12z" />
    </svg>
  );
}

export function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zm8.2 11.1 3 3-1.4 1.4-3-3z" />
    </svg>
  );
}

export function IconBell() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a6 6 0 0 1 6 6v3.2l1.6 2.8H4.4L6 12.2V9a6 6 0 0 1 6-6zm-2.2 16h4.4A2.2 2.2 0 0 1 12 21a2.2 2.2 0 0 1-2.2-2z" />
    </svg>
  );
}

export function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
    </svg>
  );
}

export function Avatar({
  label,
  tone = "teal",
  size = "md"
}: {
  label: string;
  tone?: string;
  size?: "sm" | "md" | "lg";
}) {
  return <span className={`avatar avatar-${tone} avatar-${size}`}>{label}</span>;
}

export function StatusPill({ status }: { status: string }) {
  const on = status === "active";
  return <span className={`pill ${on ? "pill-ok" : "pill-muted"}`}>{on ? "Active" : "Inactive"}</span>;
}

export function VisitPill({ type }: { type: string }) {
  const online = type === "online";
  return <span className={`pill ${online ? "pill-online" : "pill-home"}`}>{online ? "Online" : "Home visit"}</span>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
