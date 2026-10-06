"use client";

import { useEffect } from "react";
import { logAudit } from "@/app/actions";

export function AuditBeacon({ action, patientId }: { action: string; patientId: string }) {
  useEffect(() => {
    void logAudit(action, patientId);
  }, [action, patientId]);
  return null;
}
