export type ControlHealth = "healthy" | "at_risk" | "failing" | "unknown";

export type Control = {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  framework_id: number | null;
  framework_name: string | null;
  framework_code: string | null;
  category: string | null;
  owner_user_id: number | null;
  owner_name: string | null;
  is_active: boolean;
  health_status: ControlHealth;
  health_updated_at: string | null;
  created_at: string;
  updated_at: string;
  linked_sops: number;
  linked_checks: number;
  open_capas: number;
  // GRC extended fields (migration 018)
  requirement: string | null;
  clause_reference: string | null;
  evidence_required: string | null;
  risk_weight: number | null;
  control_type: string | null;
  frequency: string | null;
};

export const HEALTH_LABEL: Record<ControlHealth, string> = {
  healthy: "Healthy",
  at_risk: "At risk",
  failing: "Failing",
  unknown: "Not measured",
};

export const HEALTH_TONE: Record<ControlHealth, string> = {
  healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  at_risk: "bg-amber-50 text-amber-700 border-amber-200",
  failing: "bg-red-50 text-red-700 border-red-200",
  unknown: "bg-gray-50 text-gray-500 border-gray-200",
};

export const HEALTH_DOT: Record<ControlHealth, string> = {
  healthy: "bg-emerald-500",
  at_risk: "bg-amber-500",
  failing: "bg-red-500",
  unknown: "bg-gray-400",
};
