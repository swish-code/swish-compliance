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

export const CHECKLIST_CATEGORIES = [
  "Food Safety",
  "Fire Safety",
  "Cleanliness",
  "Customer Experience",
  "HR / Training",
  "Equipment / Maintenance",
  "Other",
];
