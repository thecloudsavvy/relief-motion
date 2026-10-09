export type Role = "admin" | "physiotherapist";
export type StaffStatus = "active" | "disabled";
export type PatientStatus = "active" | "inactive";
export type VisitType = "home" | "online";
export type VisitStatus = "draft" | "signed";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  status?: StaffStatus;
  created_at?: string;
};

export type Patient = {
  id: string;
  rm_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  city: string | null;
  address: string | null;
  sex: string | null;
  date_of_birth: string | null;
  condition: string | null;
  status: PatientStatus;
  assigned_to: string | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  referral_source: string | null;
  medical_history: string | null;
  created_by: string | null;
  created_at: string;
};

export type Visit = {
  id: string;
  patient_id: string;
  clinician_id: string | null;
  clinician_name?: string | null;
  visit_at: string;
  visit_time: string | null;
  visit_type: VisitType;
  status: VisitStatus;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  treatment: string | null;
  patient_response: string | null;
  plan: string | null;
  additional_notes: string | null;
  findings: string | null;
  created_at: string;
};

export type AuditEvent = {
  id: string;
  actor_id: string | null;
  action: string;
  patient_id: string | null;
  visit_id: string | null;
  detail: string | null;
  created_at: string;
};

export type PatientDocument = {
  id: string;
  patient_id: string;
  uploaded_by: string | null;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};
