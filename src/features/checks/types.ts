export type CheckStatus =
  | "passing"
  | "failing"
  | "pending_review"
  | "accepted_risk";

export type CheckFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annual"
  | "on_demand";

export type Check = {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  control_id: number | null;
  control_name: string | null;
  owner_user_id: number | null;
  owner_name: string | null;
  frequency: CheckFrequency;
  is_active: boolean;
  last_status: CheckStatus | null;
  last_result_at: string | null;
  next_due_date: string | null;
  /** Default checklist template this test is based on. Nullable. */
  checklist_template_id: number | null;
  checklist_template_name: string | null;
  created_at: string;
  updated_at: string;
  result_count: number;
  // GRC extended fields (migration 018)
  procedure_steps: string | null;
  evidence_needed: string | null;
  method: string | null;
  performer_role: string | null;
  reviewer_role: string | null;
  // Pass/fail criteria + free-form frequency label (migration 032).
  // pass/fail_criteria are full sentences from the auditor's source; the
  // frequency enum stays for scheduling logic, frequency_label preserves
  // the human cadence ("Monthly / Quarterly").
  pass_criteria: string | null;
  fail_criteria: string | null;
  frequency_label: string | null;
  // Per-test evidence ID (EVD-IT-0001, EVD-HR-0023, …) added in migration 035.
  evidence_code: string | null;
};

export type CheckResult = {
  id: number;
  check_id: number;
  status: CheckStatus;
  notes: string | null;
  evidence_url: string | null;
  evidence_name: string | null;
  evidence_mime: string | null;
  performed_by: number | null;
  performed_by_name: string | null;
  /** Checklist actually used when recording this specific result. */
  checklist_template_id: number | null;
  checklist_template_name: string | null;
  created_at: string;
};

export const CHECK_STATUS_LABEL: Record<CheckStatus, string> = {
  passing: "Passing",
  failing: "Failing",
  pending_review: "Pending review",
  accepted_risk: "Accepted risk",
};

export const CHECK_STATUS_TONE: Record<CheckStatus, string> = {
  passing: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failing: "bg-red-50 text-red-700 border-red-200",
  pending_review: "bg-amber-50 text-amber-700 border-amber-200",
  accepted_risk: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

/** A single checklist item linked to a test (row on the Test detail page). */
export type LinkedChecklistItem = {
  item_id: number;
  item_code: string | null;
  item_no: number;
  section: string | null;
  question: string;
  weight: number;
  is_critical: boolean;
  template_id: number;
  template_code: string | null;
  template_name: string;
};

export const FREQUENCY_LABEL: Record<CheckFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  on_demand: "On demand",
};
