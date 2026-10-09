import type { CareSession, PaymentStatus, Role, SessionStatus } from "@/lib/types";

export function parseRole(value: string | null | undefined): Role {
  if (value === "admin" || value === "operations") return value;
  return "physiotherapist";
}

export function roleLabel(role: string | null | undefined) {
  if (role === "admin") return "Admin";
  if (role === "operations") return "Operations";
  return "Physiotherapist";
}

export function planProgress(sessions: Pick<CareSession, "counts_against_package">[], purchased: number) {
  const consumed = sessions.filter((row) => row.counts_against_package).length;
  const remaining = Math.max(0, purchased - consumed);
  const pct = purchased > 0 ? Math.round((consumed / purchased) * 100) : 0;
  return { consumed, remaining, pct };
}

export function sessionStatusLabel(status: SessionStatus | string) {
  switch (status) {
    case "not_scheduled":
      return "Not scheduled";
    case "scheduled":
      return "Scheduled";
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "no_show":
      return "No-show";
    default:
      return status;
  }
}

export function sessionStatusClass(status: SessionStatus | string) {
  switch (status) {
    case "confirmed":
    case "completed":
      return "pill-ok";
    case "scheduled":
      return "pill-home";
    case "cancelled":
    case "no_show":
      return "pill-muted";
    default:
      return "pill-draft";
  }
}

export function paymentStatusLabel(status: PaymentStatus | string) {
  if (status === "paid") return "Paid";
  if (status === "partial") return "Partial";
  return "Unpaid";
}

export function nextOpenSlot<T extends Pick<CareSession, "status" | "counts_against_package" | "session_number" | "scheduled_date">>(
  sessions: T[]
) {
  const open = sessions
    .filter((row) => !row.counts_against_package && row.status !== "completed")
    .sort((a, b) => a.session_number - b.session_number);
  return (
    open.find((row) => row.status === "confirmed" || row.status === "scheduled") ||
    open.find((row) => row.status === "not_scheduled" || row.status === "cancelled" || row.status === "no_show") ||
    open[0] ||
    null
  );
}

export function weekdayShort(value: string | null) {
  if (!value) return "—";
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}
