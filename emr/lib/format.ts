export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "RM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function firstName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[0] || "there";
}

export function displayName(first: string, last: string) {
  return `${first} ${last}`.trim();
}

export function clinicianLabel(
  profile: { full_name?: string } | { full_name?: string }[] | null | undefined,
  snapshot?: string | null
) {
  const row = Array.isArray(profile) ? profile[0] : profile;
  return row?.full_name || snapshot || "Staff";
}

export function patientLabel(first: string, last: string) {
  const given = first.trim();
  const family = last.trim();
  if (!given) return family;
  const initial = family ? ` ${family[0].toUpperCase()}.` : "";
  return `${given[0].toUpperCase()}${given.slice(1)}${initial}`;
}

export function ageFromDob(dob: string | null) {
  if (!dob) return null;
  const d = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatTime(value: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

export function todayISO() {
  return lagosStamp().visit_at;
}

export function lagosStamp() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  );
  return {
    visit_at: `${parts.year}-${parts.month}-${parts.day}`,
    visit_time: `${parts.hour}:${parts.minute}`
  };
}

export function longDate(value = new Date()) {
  return value.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function lagosLongDate() {
  return new Date().toLocaleDateString("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

export function greetingLabel() {
  const hour = Number(lagosStamp().visit_time.slice(0, 2));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function sexLabel(sex: string | null) {
  if (!sex) return "";
  return sex[0].toUpperCase() + sex.slice(1);
}

export function titleCase(value: string | null | undefined) {
  if (!value) return "—";
  const trimmed = value.trim();
  if (!trimmed) return "—";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function visitTypeLabel(type: string) {
  return type === "online" ? "Online" : "Home visit";
}

export function uniqueVisitSlots<
  T extends { patient_id?: string; visit_at?: string | null; visit_time?: string | null; created_at?: string | null }
>(rows: T[]) {
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.patient_id || ""}|${row.visit_at || ""}|${String(row.visit_time || "").slice(0, 5)}`;
    const existing = map.get(key);
    if (!existing || (row.created_at || "") > (existing.created_at || "")) map.set(key, row);
  }
  return Array.from(map.values());
}

export function relativeTime(value: string) {
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function avatarTone(seed: string) {
  const tones = ["teal", "navy", "mint", "slate", "sand"];
  let n = 0;
  for (let i = 0; i < seed.length; i += 1) n += seed.charCodeAt(i);
  return tones[n % tones.length];
}

export function auditCopy(action: string) {
  switch (action) {
    case "opened_patient":
      return "opened patient record";
    case "created_patient":
      return "created a patient record";
    case "updated_patient":
      return "updated patient details";
    case "assigned_clinician":
      return "changed assigned physiotherapist";
    case "updated_staff_role":
      return "changed a staff role";
    case "disabled_staff":
      return "disabled a staff account";
    case "enabled_staff":
      return "re-enabled a staff account";
    case "deleted_staff":
      return "deleted a staff account";
    case "invited_physiotherapist":
      return "invited a physiotherapist";
    case "saved_draft":
      return "saved a draft session note";
    case "signed_note":
      return "added a session note";
    case "uploaded_document":
      return "uploaded a document";
    default:
      return action.replace(/_/g, " ");
  }
}
