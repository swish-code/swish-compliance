export type NotificationSeverity = "info" | "success" | "warning" | "critical";

export type Notification = {
  id: number;
  user_id: number;
  actor_id: number | null;
  actor_name: string | null;
  actor_role: string | null;
  kind: string;
  title: string;
  body: string | null;
  severity: NotificationSeverity;
  entity_type: string | null;
  entity_id: number | null;
  href: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export const SEVERITY_TONE: Record<NotificationSeverity, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

export const SEVERITY_DOT: Record<NotificationSeverity, string> = {
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
};

export const SEVERITY_ICON: Record<NotificationSeverity, string> = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  critical: "🚨",
};
