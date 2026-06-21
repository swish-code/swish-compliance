export type ChecklistTemplate = {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  item_count: number;
};

export type ChecklistItem = {
  id: number;
  template_id: number;
  sort_order: number;
  question: string;
  guidance: string | null;
  weight: number;
  is_critical: boolean;
};

export type ChecklistItemAnswer = "yes" | "no" | "na";

/** Latest quick-run answer for a single item, joined with the user. */
export type ChecklistItemLatestAnswer = {
  item_id: number;
  answer: ChecklistItemAnswer;
  note: string | null;
  answered_by: number | null;
  answered_by_name: string | null;
  answered_at: string;
};

// Fallback used only when the DB has no `checklist_category` rows yet.
// The live list comes from config_options and is editable from /admin/config.
export const CHECKLIST_CATEGORIES_FALLBACK = [
  "Food Safety",
  "Fire Safety",
  "Cleanliness",
  "Customer Experience",
  "HR / Training",
  "Equipment / Maintenance",
  "Other",
];
