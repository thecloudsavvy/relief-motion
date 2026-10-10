import Link from "next/link";
import { assignClinician } from "@/app/actions";
import { AuditBeacon } from "@/components/AuditBeacon";
import { DocumentUpload } from "@/components/DocumentUpload";
import { Avatar, StatusPill } from "@/components/ui";
import { VisitNote } from "@/components/VisitNote";
import { requirePatientAccess } from "@/lib/auth";
import {
  ageFromDob,
  avatarTone,
  clinicianLabel,
  displayName,
  formatDate,
  formatDateTime,
  formatTime,
  initials,
  sexLabel,
  titleCase,
  uniqueVisitSlots,
  visitTypeLabel
} from "@/lib/format";
import type { Profile } from "@/lib/types";

type Tab = "overview" | "timeline" | "notes" | "documents";

export default async function PatientChartPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview", error } = await searchParams;
  const current = (["overview", "timeline", "notes", "documents"].includes(tab) ? tab : "overview") as Tab;
  const { supabase, isAdmin, patient } = await requirePatientAccess(id);

  const [{ data: visits }, { data: profiles }, { data: documents }] = await Promise.all([
    supabase
      .from("visits")
      .select(
        "id, patient_id, clinician_id, clinician_name, visit_at, visit_time, visit_type, status, subjective, objective, assessment, treatment, patient_response, plan, additional_notes, findings, created_at, profiles!visits_clinician_id_fkey(full_name)"
      )
      .eq("patient_id", id)
      .order("visit_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, role, status").order("full_name"),
    supabase
      .from("patient_documents")
      .select("id, filename, storage_path, created_at, size_bytes, uploaded_by, profiles!patient_documents_uploaded_by_fkey(full_name)")
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
  ]);

  const assigned = (profiles as Profile[] | null)?.find((row) => row.id === patient.assigned_to);
  const name = displayName(patient.first_name, patient.last_name);
  const age = ageFromDob(patient.date_of_birth);
  const allVisits = uniqueVisitSlots(visits || []);
  const signed = allVisits.filter((row) => row.status !== "draft");

  const files = await Promise.all(
    (documents || []).map(async (doc) => {
      const { data } = await supabase.storage.from("patient-documents").createSignedUrl(doc.storage_path, 3600);
      const uploader = Array.isArray(doc.profiles) ? doc.profiles[0] : doc.profiles;
      return { ...doc, url: data?.signedUrl || "", uploader: uploader?.full_name || "Staff" };
    })
  );

  const tabHref = (value: Tab) => `/patients/${id}?tab=${value}`;

  return (
    <>
      <AuditBeacon action="opened_patient" patientId={id} />
      <p className="crumb">
        <Link href="/patients">Patients</Link> · {patient.rm_id}
      </p>
      {error ? <div className="error">{error}</div> : null}

      <section className="chart-head">
        <div className="chart-id">
          <Avatar label={initials(name)} tone={avatarTone(name)} size="lg" />
          <div>
            <p className="mono">{patient.rm_id}</p>
            <h1>
              {name} <StatusPill status={patient.status || "active"} />
            </h1>
            <p className="meta-line">
              {age ? `${age} yrs` : "Age —"}
              {patient.sex ? ` · ${sexLabel(patient.sex)}` : ""}
              {patient.phone ? ` · ${patient.phone}` : ""}
              {patient.city ? ` · ${patient.city}` : ""}
            </p>
          </div>
          <div className="chart-actions">
            <Link className="btn" href={`/patients/${id}/sessions/new`}>
              Log visit
            </Link>
            <div className="assign">
              <p className="muted">Assigned physiotherapist</p>
              <strong>{assigned?.full_name || "Unassigned"}</strong>
              {isAdmin ? (
                <form action={assignClinician.bind(null, id)}>
                  <select name="assigned_to" defaultValue={patient.assigned_to || ""}>
                    <option value="">Unassigned</option>
                    {(profiles as Profile[] | null)
                      ?.filter((row) => row.status !== "disabled" || row.id === patient.assigned_to)
                      .map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.full_name || "Staff"}
                          {row.status === "disabled" ? " (disabled)" : ""}
                        </option>
                      ))}
                  </select>
                  <button className="btn btn-ghost" type="submit">
                    Change
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
        <div className="facts">
          <div>
            <b>Primary condition</b>
            {titleCase(patient.condition)}
          </div>
          <div>
            <b>Phone</b>
            {patient.phone || "—"}
          </div>
          <div>
            <b>Location</b>
            {patient.city || patient.address || "—"}
          </div>
        </div>
        <nav className="tabs">
          <Link className={current === "overview" ? "active" : ""} href={tabHref("overview")}>
            Overview
          </Link>
          <Link className={current === "timeline" ? "active" : ""} href={tabHref("timeline")}>
            Clinical Timeline
          </Link>
          <Link className={current === "notes" ? "active" : ""} href={tabHref("notes")}>
            Session Notes
          </Link>
          <Link className={current === "documents" ? "active" : ""} href={tabHref("documents")}>
            Documents
          </Link>
        </nav>
      </section>

      {current === "overview" ? (
        <div className="split">
          <section className="panel">
            <div className="page-head">
              <h2>Patient information</h2>
              <Link className="btn btn-ghost" href={`/patients/${id}/edit`}>
                Edit
              </Link>
            </div>
            <dl className="dl">
              <dt>Full name</dt>
              <dd>{name}</dd>
              <dt>Relief Motion ID</dt>
              <dd>{patient.rm_id}</dd>
              <dt>Date of birth</dt>
              <dd>
                {patient.date_of_birth || "—"}
                {age ? ` (${age} yrs)` : ""}
              </dd>
              <dt>Sex</dt>
              <dd>{sexLabel(patient.sex) || "—"}</dd>
              <dt>Phone</dt>
              <dd>{patient.phone || "—"}</dd>
              <dt>Address</dt>
              <dd>{patient.address || patient.city || "—"}</dd>
              <dt>Emergency contact</dt>
              <dd>
                {patient.emergency_name || "—"}
                {patient.emergency_phone ? ` · ${patient.emergency_phone}` : ""}
              </dd>
              <dt>Referral source</dt>
              <dd>{patient.referral_source || "—"}</dd>
              <dt>Status</dt>
              <dd>
                <StatusPill status={patient.status || "active"} />
              </dd>
            </dl>
            <h2 style={{ marginTop: "1.2rem" }}>Medical history</h2>
            <p>{patient.medical_history || "No medical history recorded."}</p>
          </section>
          <section className="panel">
            <div className="page-head">
              <h2>Previous sessions</h2>
              <Link href={tabHref("timeline")}>View all</Link>
            </div>
            {signed.length ? (
              <div className="timeline">
                {signed.slice(0, 6).map((visit) => (
                  <VisitNote
                    key={visit.id}
                    visit={visit}
                    clinician={clinicianLabel(visit.profiles, visit.clinician_name)}
                  />
                ))}
              </div>
            ) : (
              <p className="empty">No signed sessions yet. Start with Log visit.</p>
            )}
          </section>
        </div>
      ) : null}

      {current === "timeline" ? (
        <section className="panel">
          <h2>Clinical timeline</h2>
          {signed.length ? (
            <div className="timeline">
              {signed.map((visit) => (
                <VisitNote
                  key={visit.id}
                  visit={visit}
                  clinician={clinicianLabel(visit.profiles, visit.clinician_name)}
                />
              ))}
            </div>
          ) : (
            <p className="empty">No signed sessions yet. Start with Log visit.</p>
          )}
        </section>
      ) : null}

      {current === "notes" ? (
        <section className="panel">
          <h2>Session notes</h2>
          {allVisits.length ? (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Clinician</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allVisits.map((visit) => {
                  const href =
                    visit.status === "draft"
                      ? `/patients/${id}/sessions/${visit.id}`
                      : `/patients/${id}?tab=timeline`;
                  return (
                    <tr key={visit.id}>
                      <td>
                        {formatDate(visit.visit_at)}
                        {visit.visit_time ? ` · ${formatTime(visit.visit_time)}` : ""}
                      </td>
                      <td>{visitTypeLabel(visit.visit_type)}</td>
                      <td>{clinicianLabel(visit.profiles, visit.clinician_name)}</td>
                      <td>
                        <span className={`pill ${visit.status === "draft" ? "pill-draft" : "pill-ok"}`}>
                          {visit.status === "draft" ? "Draft" : "Signed"}
                        </span>
                      </td>
                      <td>
                        <Link className="row-action" href={href}>
                          {visit.status === "draft" ? "Continue →" : "View session →"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="empty">No notes yet. Start with Log visit.</p>
          )}
        </section>
      ) : null}

      {current === "documents" ? (
        <section className="panel">
          <h2>Documents</h2>
          <DocumentUpload patientId={id} />
          {files.length ? (
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Uploaded by</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id}>
                    <td>
                      {file.url ? (
                        <a href={file.url} target="_blank" rel="noreferrer">
                          {file.filename}
                        </a>
                      ) : (
                        file.filename
                      )}
                    </td>
                    <td>{file.uploader}</td>
                    <td>{formatDateTime(file.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty">No documents yet. Referral letters and reports can live here.</p>
          )}
        </section>
      ) : null}
    </>
  );
}
