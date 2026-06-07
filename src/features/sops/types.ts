export type SopStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "archived";

export const SOP_STATUSES: SopStatus[] = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "archived",
];

export type Sop = {
  id: number;
  code: string | null;
  title: string;
  description: string | null;
  version: string;
  status: SopStatus;
  file_url: string | null;
  image_data_url: string | null;
  brand_id: number | null;
  brand_name: string | null;
  department_id: number | null;
  department_name: string | null;
  owner_id: number | null;
  owner_name: string | null;
  created_by: number | null;
  created_by_name: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  effective_date: string | null;
  review_date: string | null;
  created_at: string;
  updated_at: string;
};

export const SOP_STATUS_LABEL: Record<SopStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
};

export const SOP_STATUS_TONE: Record<SopStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  pending_review: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  archived: "bg-gray-50 text-gray-500 border-gray-200",
};
