-- =========================================================================
-- Hierarchical organisation units for SWiSH (Centralised functions +
-- Brand-wise functions + branches). Self-referencing tree, 1..N levels.
--
-- Why a separate table (and not just brands+departments):
--   The user's org tree mixes "department-shaped" rooted under
--   Centralised (HR, Finance, CPU, IT, CX) with "brand-shaped" rooted
--   under Brand Wise (Marketing per brand, Operation per brand →
--   branches). brands and departments are flat, single-purpose tables;
--   forcing them to express a 4-level mixed hierarchy would muddy them.
--   Keeping org_units alongside lets each tool pick the right scope.
-- =========================================================================

CREATE TABLE IF NOT EXISTS org_units (
  id           SERIAL PRIMARY KEY,
  code         VARCHAR(40)  NOT NULL UNIQUE,
    -- 'A', 'A.1', 'A.1.1', 'B.2.3.1' …
  name         VARCHAR(200) NOT NULL,
  parent_id    INTEGER      REFERENCES org_units(id) ON DELETE CASCADE,
  level        SMALLINT     NOT NULL,
    -- 1 = root (A / B), 2 = department, 3 = sub, 4 = branch …
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_units_parent ON org_units(parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_org_units_level  ON org_units(level);

DROP TRIGGER IF EXISTS trg_org_units_updated_at ON org_units;
CREATE TRIGGER trg_org_units_updated_at
  BEFORE UPDATE ON org_units
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
