-- =========================================================================
-- SOPs — two new boolean flags that capture "spans the whole company"
-- semantics for the Brand and Department fields:
--
--   brand_is_function = TRUE means this SOP is a Brand / Function SOP
--     (cross-brand, applies to a function not a specific restaurant brand).
--     In that case brand_id is ignored.
--
--   is_all_departments = TRUE means this SOP applies to every department,
--     not a single one. In that case department_id is ignored.
--
-- Both default to FALSE so existing SOPs keep their current behaviour
-- (a NULL brand_id / department_id still means "not specified yet", a
-- distinct state from "applies to all").
-- =========================================================================

ALTER TABLE sops
  ADD COLUMN IF NOT EXISTS brand_is_function  BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE sops
  ADD COLUMN IF NOT EXISTS is_all_departments BOOLEAN NOT NULL DEFAULT FALSE;
