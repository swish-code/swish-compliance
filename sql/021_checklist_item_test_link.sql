-- =========================================================================
-- Per-item code + section on checklist_items, plus a many-to-many junction
-- so a test (check) can reference any number of individual checklist items
-- (across templates). This is what powers the "Linked Checklist Items"
-- section on the Test detail page.
--
-- Why per-item code/section:
--   The source spreadsheet (and the auditors who use it) identify each
--   checkpoint by a code like CHK-FOO-001 and group them under sections
--   like "Storage" / "Handwashing". Those concepts don't fit on the
--   template (which is the parent grouping). They belong on the item.
--
-- Why many-to-many:
--   checks.checklist_template_id (migration 015) is kept as the *default*
--   template for the "Record a new result" dropdown. But a single test can
--   have items pulled from several templates — e.g. ISO22000-TEST-001-2
--   spans Food Safety + Hygiene items. A junction table is the only way
--   to express that without duplicating items.
-- =========================================================================

ALTER TABLE checklist_items
  ADD COLUMN IF NOT EXISTS code    VARCHAR(40),
  ADD COLUMN IF NOT EXISTS section VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS uq_checklist_items_code
  ON checklist_items(code) WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checklist_items_section
  ON checklist_items(section);

CREATE TABLE IF NOT EXISTS check_checklist_items (
  check_id          INTEGER NOT NULL REFERENCES checks(id)           ON DELETE CASCADE,
  checklist_item_id INTEGER NOT NULL REFERENCES checklist_items(id)  ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (check_id, checklist_item_id)
);

CREATE INDEX IF NOT EXISTS idx_cci_check ON check_checklist_items(check_id);
CREATE INDEX IF NOT EXISTS idx_cci_item  ON check_checklist_items(checklist_item_id);
