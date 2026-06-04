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
