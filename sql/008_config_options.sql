-- =========================================================================
-- Generic lookup / config table.
-- Each row is one option inside a named "kind" (e.g. 'checklist_category').
-- The admin Config page lists all kinds and lets admins add / rename /
-- activate / deactivate / reorder options without touching code.
-- =========================================================================

CREATE TABLE IF NOT EXISTS config_options (
  id          SERIAL PRIMARY KEY,
  kind        VARCHAR(60)  NOT NULL,
  value       VARCHAR(120) NOT NULL,
  label       VARCHAR(255) NOT NULL,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(kind, value)
);
CREATE INDEX IF NOT EXISTS idx_config_kind_active ON config_options(kind, is_active, sort_order);

DROP TRIGGER IF EXISTS trg_config_options_updated_at ON config_options;
CREATE TRIGGER trg_config_options_updated_at
  BEFORE UPDATE ON config_options
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed defaults (idempotent) ----------------------------------------------

-- 1) Checklist categories — shown on /checklists/templates/new and edit
INSERT INTO config_options (kind, value, label, sort_order) VALUES
  ('checklist_category', 'food_safety',          'Food Safety',            1),
  ('checklist_category', 'fire_safety',          'Fire Safety',            2),
  ('checklist_category', 'cleanliness',          'Cleanliness',            3),
  ('checklist_category', 'customer_experience',  'Customer Experience',    4),
  ('checklist_category', 'hr_training',          'HR / Training',          5),
  ('checklist_category', 'equipment',            'Equipment / Maintenance', 6),
  ('checklist_category', 'other',                'Other',                  7)
ON CONFLICT (kind, value) DO NOTHING;

-- 2) Framework categories — shown on /frameworks
INSERT INTO config_options (kind, value, label, sort_order) VALUES
  ('framework_category', 'food_safety', 'Food Safety', 1),
  ('framework_category', 'hse',         'HSE',         2),
  ('framework_category', 'legal',       'Legal',       3),
  ('framework_category', 'quality',     'Quality',     4),
  ('framework_category', 'environment', 'Environment', 5),
  ('framework_category', 'other',       'Other',       6)
ON CONFLICT (kind, value) DO NOTHING;

-- 3) Control categories — shown on /controls/new and edit
INSERT INTO config_options (kind, value, label, sort_order) VALUES
  ('control_category', 'preventive',  'Preventive',  1),
  ('control_category', 'detective',   'Detective',   2),
  ('control_category', 'corrective',  'Corrective',  3),
  ('control_category', 'directive',   'Directive',   4)
ON CONFLICT (kind, value) DO NOTHING;

-- 4) Brand-extra (already managed under /admin/brands — listed here for
--    visibility but real source of truth stays the brands table)
-- (no rows seeded; this kind is purely informational in the Config UI)
