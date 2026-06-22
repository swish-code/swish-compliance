-- =========================================================================
-- Seed the 3 domains the user defined and link existing/new frameworks to
-- them. Three pieces:
--
--   1. Insert the 3 domains (IT-DOM, HR-DOM, ECS-DOM). Idempotent.
--   2. Insert the 7 IT-FW-* and 11 HR-FW-* frameworks that aren't part
--      of the ECS GRC bundle. Names are placeholders the user can rename
--      at any time from /frameworks.
--   3. Backfill domain_id on every framework whose code we recognise.
--      UPDATE … WHERE code IN (…) silently skips codes that don't exist
--      yet (e.g. an environment that hasn't imported the ECS bundle).
-- =========================================================================

-- 1) Domains -------------------------------------------------------------
INSERT INTO domains (code, name, description, sort_order) VALUES
  ('IT-DOM',  'IT / Cybersecurity',
   'Information technology, infrastructure, application security and cyber controls.', 1),
  ('HR-DOM',  'HR',
   'Human resources policies, recruitment, payroll, employee relations and L&D.',      2),
  ('ECS-DOM', 'ECS Compliance',
   'SWiSH Enterprise Compliance Standards — the operational/food-safety/HSE bundle.',  3)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order  = EXCLUDED.sort_order;

-- 2a) IT-FW-001..007 — placeholder names, rename in /frameworks ----------
INSERT INTO frameworks (code, name, description, category, is_active) VALUES
  ('IT-FW-001', 'IT Framework 1', 'Auto-seeded IT / Cybersecurity framework #1. Rename in /frameworks.', 'IT / Cybersecurity', TRUE),
  ('IT-FW-002', 'IT Framework 2', 'Auto-seeded IT / Cybersecurity framework #2. Rename in /frameworks.', 'IT / Cybersecurity', TRUE),
  ('IT-FW-003', 'IT Framework 3', 'Auto-seeded IT / Cybersecurity framework #3. Rename in /frameworks.', 'IT / Cybersecurity', TRUE),
  ('IT-FW-004', 'IT Framework 4', 'Auto-seeded IT / Cybersecurity framework #4. Rename in /frameworks.', 'IT / Cybersecurity', TRUE),
  ('IT-FW-005', 'IT Framework 5', 'Auto-seeded IT / Cybersecurity framework #5. Rename in /frameworks.', 'IT / Cybersecurity', TRUE),
  ('IT-FW-006', 'IT Framework 6', 'Auto-seeded IT / Cybersecurity framework #6. Rename in /frameworks.', 'IT / Cybersecurity', TRUE),
  ('IT-FW-007', 'IT Framework 7', 'Auto-seeded IT / Cybersecurity framework #7. Rename in /frameworks.', 'IT / Cybersecurity', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 2b) HR-FW-001..011 — placeholder names ---------------------------------
INSERT INTO frameworks (code, name, description, category, is_active) VALUES
  ('HR-FW-001', 'HR Framework 1',  'Auto-seeded HR framework #1. Rename in /frameworks.',  'HR', TRUE),
  ('HR-FW-002', 'HR Framework 2',  'Auto-seeded HR framework #2. Rename in /frameworks.',  'HR', TRUE),
  ('HR-FW-003', 'HR Framework 3',  'Auto-seeded HR framework #3. Rename in /frameworks.',  'HR', TRUE),
  ('HR-FW-004', 'HR Framework 4',  'Auto-seeded HR framework #4. Rename in /frameworks.',  'HR', TRUE),
  ('HR-FW-005', 'HR Framework 5',  'Auto-seeded HR framework #5. Rename in /frameworks.',  'HR', TRUE),
  ('HR-FW-006', 'HR Framework 6',  'Auto-seeded HR framework #6. Rename in /frameworks.',  'HR', TRUE),
  ('HR-FW-007', 'HR Framework 7',  'Auto-seeded HR framework #7. Rename in /frameworks.',  'HR', TRUE),
  ('HR-FW-008', 'HR Framework 8',  'Auto-seeded HR framework #8. Rename in /frameworks.',  'HR', TRUE),
  ('HR-FW-009', 'HR Framework 9',  'Auto-seeded HR framework #9. Rename in /frameworks.',  'HR', TRUE),
  ('HR-FW-010', 'HR Framework 10', 'Auto-seeded HR framework #10. Rename in /frameworks.', 'HR', TRUE),
  ('HR-FW-011', 'HR Framework 11', 'Auto-seeded HR framework #11. Rename in /frameworks.', 'HR', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 3) Backfill domain_id on every framework we know about -----------------
-- IT-FW-001..007 → IT-DOM
UPDATE frameworks SET domain_id = d.id
FROM domains d WHERE d.code = 'IT-DOM' AND frameworks.code LIKE 'IT-FW-%';

-- HR-FW-001..011 → HR-DOM
UPDATE frameworks SET domain_id = d.id
FROM domains d WHERE d.code = 'HR-DOM' AND frameworks.code LIKE 'HR-FW-%';

-- FW-001..FW-024 (ECS GRC bundle) → ECS-DOM
UPDATE frameworks SET domain_id = d.id
FROM domains d
WHERE d.code = 'ECS-DOM'
  AND frameworks.code ~ '^FW-[0-9]+$';
