export type OrgUnit = {
  id: number;
  code: string;
  name: string;
  parent_id: number | null;
  level: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * A row already laid out for a hierarchical dropdown — `display_label`
 * has the indentation baked in (em-spaces) so the consumer just renders
 * the string. Saves the page from doing tree-walks in JSX.
 */
export type OrgUnitOption = {
  id: number;
  code: string;
  name: string;
  level: number;
  parent_id: number | null;
  display_label: string;
};
