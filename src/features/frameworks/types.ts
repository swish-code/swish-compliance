export type Framework = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  activated_by: number | null;
  activated_by_name: string | null;
  activated_at: string | null;
  owner_user_id: number | null;
  owner_name: string | null;
  created_at: string;
  updated_at: string;
  control_count: number;
  active_control_count: number;
  // GRC extended fields (migration 018)
  reference_source: string | null;
  scope: string | null;
  review_frequency: string | null;
};
