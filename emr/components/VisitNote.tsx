import { formatDate, formatTime, visitTypeLabel } from "@/lib/format";

export function VisitNote({
  visit,
  clinician
}: {
  visit: {
    visit_at: string;
    visit_time?: string | null;
    visit_type: string;
    status?: string;
    subjective?: string | null;
    objective?: string | null;
    assessment?: string | null;
    treatment?: string | null;
    patient_response?: string | null;
    plan?: string | null;
    additional_notes?: string | null;
    findings?: string | null;
  };
  clinician?: string | null;
}) {
  const soap = [
    ["Subjective", visit.subjective || visit.findings],
    ["Objective", visit.objective],
    ["Assessment", visit.assessment],
    ["Treatment", visit.treatment],
    ["Patient response", visit.patient_response],
    ["Plan / next session", visit.plan],
    ["Additional notes", visit.additional_notes]
  ].filter(([, value]) => Boolean(value));
  const continuityOnly = Boolean(visit.treatment) && soap.length === 1 && soap[0][0] === "Treatment";

  return (
    <article className="note">
      <h3>
        {formatDate(visit.visit_at)}
        {visit.visit_time ? ` · ${formatTime(visit.visit_time)}` : ""} · {visitTypeLabel(visit.visit_type)}
        {visit.status === "draft" ? " · Draft" : ""}
      </h3>
      <p className="muted">{clinician || "Staff"}</p>
      {continuityOnly ? (
        <p>{visit.treatment}</p>
      ) : soap.length ? (
        soap.map(([label, value]) => (
          <p key={label}>
            <strong>{label}.</strong> {value}
          </p>
        ))
      ) : (
        <p className="muted">No narrative recorded.</p>
      )}
    </article>
  );
}
