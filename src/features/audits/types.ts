export type AuditStatus = "in_progress" | "submitted" | "closed";

export type Audit = {
  id: number;
  template_id: number;
  template_name: string;
  template_category: string | null;
  brand_id: number | null;
  brand_name: string | null;
  department_id: number | null;
  department_name: string | null;
  location: string | null;
  auditor_id: number | null;
  auditor_name: string | null;
  audit_date: string;
  status: AuditStatus;
  score: string | null;          // numeric returned as string by pg
  max_score: number | null;
  critical_failed: number;
  summary: string | null;
  submitted_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditResponse = {
  id: number;
  audit_id: number;
  item_id: number;
  response: "pass" | "fail" | "na" | null;
  notes: string | null;
  evidence_url: string | null;
  evidence_name: string | null;
  evidence_mime: string | null;
};

export const AUDIT_STATUS_LABEL: Record<AuditStatus, string> = {
  in_progress: "In progress",
  submitted: "Submitted",
  closed: "Closed",
};

export const AUDIT_STATUS_TONE: Record<AuditStatus, string> = {
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  submitted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
