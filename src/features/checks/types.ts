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

export const FREQUENCY_LABEL: Record<CheckFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  on_demand: "On demand",
};
