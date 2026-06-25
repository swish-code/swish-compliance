export type AuditStatus = "in_progress" | "submitted" | "closed";

export type Audit = {
  id: number;
  // template_id is nullable since migration 038 — new audits scope by
  // tests, not a single template. template_name/category are NULL for
  // those audits.
  template_id: number | null;
  template_name: string | null;
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
  // Policy & Framework the audit is performed against (migration 019)
  policy_id: number | null;
  policy_title: string | null;
  policy_code: string | null;
  framework_id: number | null;
  framework_name: string | null;
  framework_code: string | null;
  // Scope chain (migration 028) + window/assignee (029)
  domain_id: number | null;
  domain_name: string | null;
  domain_code: string | null;
  control_id: number | null;
  control_name: string | null;
  control_code: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  start_at: string | null;
  end_at: string | null;
};

/**
 * One row per (test, item) pair for an audit. The same item can appear
 * under multiple tests when it's linked to several of them via the
 * check_checklist_items junction — that's intentional, the auditor
 * sees the question in the context of each test.
 */
export type AuditScopeRow = {
  test_id: number;
  test_code: string | null;
  test_name: string;
  template_id: number;
  template_code: string | null;
  template_name: string;
  item_id: number;
  item_code: string | null;
  item_sort_order: number;
  question: string;
  weight: number;
  is_critical: boolean;
  // Latest response on this item for this audit (shared across all
  // instances of the same item under different tests).
  response: "pass" | "fail" | "na" | null;
  notes: string | null;
  evidence_url: string | null;
  evidence_name: string | null;
  evidence_mime: string | null;
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
