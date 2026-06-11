-- =========================================================================
-- GRC extended fields — extra columns on frameworks / controls / checks so
-- the ECS GRC bundle imports without losing any source-of-truth data.
--
-- All columns are nullable; existing rows stay valid and the import script
-- only fills these fields when they are NULL (COALESCE in ON CONFLICT) so a
-- re-import never overwrites a value the user has edited in the UI.
-- =========================================================================

-- ── Frameworks ──────────────────────────────────────────────────────────
ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS reference_source TEXT;
ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS scope            TEXT;
ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS review_frequency VARCHAR(60);

-- ── Controls ────────────────────────────────────────────────────────────
ALTER TABLE controls ADD COLUMN IF NOT EXISTS requirement        TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS clause_reference   VARCHAR(255);
ALTER TABLE controls ADD COLUMN IF NOT EXISTS evidence_required  TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS risk_weight        INTEGER;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS control_type       VARCHAR(80);
ALTER TABLE controls ADD COLUMN IF NOT EXISTS frequency          VARCHAR(60);

-- ── Checks (Tests) ──────────────────────────────────────────────────────
ALTER TABLE checks ADD COLUMN IF NOT EXISTS procedure_steps TEXT;
ALTER TABLE checks ADD COLUMN IF NOT EXISTS evidence_needed TEXT;
ALTER TABLE checks ADD COLUMN IF NOT EXISTS method          VARCHAR(80);
ALTER TABLE checks ADD COLUMN IF NOT EXISTS performer_role  VARCHAR(150);
ALTER TABLE checks ADD COLUMN IF NOT EXISTS reviewer_role   VARCHAR(150);
