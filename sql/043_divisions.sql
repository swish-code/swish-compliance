-- =========================================================================
-- Division → Department hierarchy (user spec 2026-07-09).
--
-- The system had no "division" concept and a flat, duplicated departments
-- table. This migration adds:
--   - divisions (top level of the org tree)
--   - departments.division_id      (which division a department rolls up to)
--   - departments.parent_department_id (sub-departments, e.g. Complaints
--       Operations under Customer Care, Maintenance under Property & Leasing)
--   - departments.code             (stable DEPT-* code)
--
-- The 13 divisions are seeded here (idempotent). The canonical departments
-- and the consolidation of the legacy duplicate rows are done by a separate
-- reviewed one-time script (not this migration) after the mapping is signed
-- off, so we never blindly create a second set of department rows on deploy.
-- =========================================================================

CREATE TABLE IF NOT EXISTS divisions (
  id           SERIAL PRIMARY KEY,
  code         VARCHAR(40)  NOT NULL UNIQUE,
  name         VARCHAR(200) NOT NULL,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_divisions_updated_at ON divisions;
CREATE TRIGGER trg_divisions_updated_at
  BEFORE UPDATE ON divisions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS division_id          INTEGER REFERENCES divisions(id)   ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS code                 VARCHAR(40);

CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_code ON departments(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_departments_division ON departments(division_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent   ON departments(parent_department_id);

-- Seed the 13 divisions (exact tree from the user). Idempotent by code.
INSERT INTO divisions (code, name, sort_order) VALUES
  ('DIV-BEX',  'Business Excellence Division',            1),
  ('DIV-CX',   'Customer Experience Division',            2),
  ('DIV-HR',   'Human Resources Division',                3),
  ('DIV-IT',   'Information Technology Division',          4),
  ('DIV-ADM',  'Admin & Government Formalities Division',  5),
  ('DIV-FIN',  'Finance Division',                        6),
  ('DIV-SC',   'Supply Chain Division',                   7),
  ('DIV-WL',   'Warehouse & Logistics Division',          8),
  ('DIV-PROD', 'Production Division',                     9),
  ('DIV-RD',   'R&D Division',                            10),
  ('DIV-PL',   'Property & Leasing Division',             11),
  ('DIV-MKT',  'Marketing Division',                      12),
  ('DIV-LOG',  'Digital Commerce Division',              13)
ON CONFLICT (code) DO NOTHING;
