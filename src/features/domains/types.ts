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
};

export type DomainFramework = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
};
