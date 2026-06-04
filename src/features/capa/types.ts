export type CapaStatus =
  | "open"
  | "in_progress"
  | "submitted"
  | "verified"
  | "closed"
  | "rejected";

export type CapaSeverity = "low" | "medium" | "high" | "critical";

export type Capa = {
  id: number;
  code: string | null;
  title: string;
  description: string | null;
  severity: CapaSeverity;
  status: CapaStatus;
  source_audit_id: number | null;
  source_item_id: number | null;
  brand_id: number | null;
  brand_name: string | null;
  department_id: number | null;
  department_name: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  created_by: number | null;
  created_by_name: string | null;
  verified_by: number | null;
  verified_by_name: string | null;
  due_date: string | null;
  resolution_note: string | null;
  evidence_url: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const CAPA_STATUS_LABEL: Record<CapaStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  submitted: "Submitted",
  verified: "Verified",
  closed: "Closed",
  rejected: "Rejected",
};

export const CAPA_STATUS_TONE: Record<CapaStatus, string> = {
  open: "bg-gray-100 text-gray-700 border-gray-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  submitted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-emerald-50 text-emerald-800 border-emerald-300",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export const SEVERITY_LABEL: Record<CapaSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const SEVERITY_TONE: Record<CapaSeverity, string> = {
  low: "bg-gray-50 text-gray-600 border-gray-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};
