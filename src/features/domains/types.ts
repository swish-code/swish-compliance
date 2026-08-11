export type Domain = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Count of frameworks pointing at this domain. */
  framework_count: number;
  /** Per-domain audit guidance from the SOP_GRC workbook (migration 049). */
  review_scope_method: string | null;
  evidence_to_obtain: string | null;
  review_focus: string | null;
  how_to_verify: string | null;
};

export type DomainOption = { id: number; code: string; name: string };

export type DomainFramework = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
};
