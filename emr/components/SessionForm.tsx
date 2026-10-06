import { formatDate, formatTime } from "@/lib/format";
import { VisitNote } from "@/components/VisitNote";

type RailVisit = {
  id: string;
  visit_at: string;
  visit_time?: string | null;
  visit_type: string;
  status?: "draft" | "signed";
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  treatment?: string | null;
  patient_response?: string | null;
  plan?: string | null;
  additional_notes?: string | null;
  findings?: string | null;
  clinician?: string;
};

type Fields = {
  visit_at?: string;
  visit_time?: string | null;
  visit_type?: string;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  treatment?: string | null;
  patient_response?: string | null;
  plan?: string | null;
  additional_notes?: string | null;
  findings?: string | null;
};

export function SessionForm({
  action,
  clinicianName,
  error,
  visit
}: {
  action: (formData: FormData) => void | Promise<void>;
  clinicianName: string;
  error?: string;
  visit?: Fields;
}) {
  const recorded = visit?.visit_at
    ? `${formatDate(visit.visit_at)}${visit.visit_time ? ` · ${formatTime(visit.visit_time)}` : ""}`
    : "Recorded automatically when you save";

  return (
    <form className="panel" action={action}>
      {error ? <div className="error">{error}</div> : null}
      <div className="grid-2">
        <div>
          <label>Session type</label>
          <label className="muted">
            <input
              type="radio"
              name="visit_type"
              value="home"
              defaultChecked={(visit?.visit_type || "home") === "home"}
              style={{ width: "auto", marginRight: "0.4rem" }}
            />
            Home visit
          </label>
          <label className="muted">
            <input
              type="radio"
              name="visit_type"
              value="online"
              defaultChecked={visit?.visit_type === "online"}
              style={{ width: "auto", marginRight: "0.4rem" }}
            />
            Online consultation
          </label>
        </div>
        <div>
          <label>Clinician</label>
          <input value={clinicianName} disabled />
        </div>
        <div>
          <label>Timestamp</label>
          <input
            value={recorded}
            disabled
          />
        </div>
      </div>
      <label htmlFor="subjective">
        Subjective <span className="hint">(what the patient reports)</span>
      </label>
      <textarea id="subjective" name="subjective" defaultValue={visit?.subjective || visit?.findings || ""} />
      <label htmlFor="objective">
        Objective <span className="hint">(your findings / observations)</span>
      </label>
      <textarea id="objective" name="objective" defaultValue={visit?.objective || ""} />
      <label htmlFor="assessment">
        Assessment <span className="hint">(clinical interpretation)</span>
      </label>
      <textarea id="assessment" name="assessment" defaultValue={visit?.assessment || ""} />
      <label htmlFor="treatment">
        Treatment / intervention <span className="hint">(what was done)</span>
      </label>
      <textarea id="treatment" name="treatment" defaultValue={visit?.treatment || ""} />
      <label htmlFor="patient_response">
        Patient response <span className="hint">(how they responded)</span>
      </label>
      <textarea id="patient_response" name="patient_response" defaultValue={visit?.patient_response || ""} />
      <div className="grid-2">
        <div>
          <label htmlFor="plan">Plan / next session</label>
          <textarea id="plan" name="plan" defaultValue={visit?.plan || ""} />
        </div>
        <div>
          <label htmlFor="additional_notes">Additional notes (optional)</label>
          <textarea id="additional_notes" name="additional_notes" defaultValue={visit?.additional_notes || ""} />
        </div>
      </div>
      <div className="actions-row">
        <button className="btn btn-ghost" name="intent" value="draft" type="submit">
          Save as Draft
        </button>
        <button className="btn btn-navy" name="intent" value="signed" type="submit">
          Sign &amp; Note
        </button>
      </div>
    </form>
  );
}

export function SessionRails({
  visits,
  events
}: {
  visits: RailVisit[];
  events: { id: string; text: string; when: string }[];
}) {
  return (
    <div>
      <section className="panel">
        <h2>Recent sessions</h2>
        {visits.length ? (
          visits.map((visit) => (
            <div key={visit.id} style={{ marginBottom: "0.9rem" }}>
              <VisitNote visit={visit} clinician={visit.clinician} />
            </div>
          ))
        ) : (
          <p className="empty">No sessions yet.</p>
        )}
      </section>
      <section className="panel">
        <h2>Audit log (recent)</h2>
        {events.length ? (
          events.map((event) => (
            <p key={event.id} className="muted" style={{ marginBottom: "0.55rem" }}>
              <strong>{event.text}</strong>
              <br />
              {event.when}
            </p>
          ))
        ) : (
          <p className="empty">No activity yet.</p>
        )}
      </section>
    </div>
  );
}
