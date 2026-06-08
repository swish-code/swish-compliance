-- =========================================================================
-- Link tests (checks) to checklist templates.
--   - checks.checklist_template_id      → the default checklist this test
--                                          is based on. Set on creation.
--   - check_results.checklist_template_id → the checklist actually used
--                                          when recording the result. Lets
--                                          the operator override the
--                                          default per result.
-- Both are nullable so existing rows stay valid; SET NULL on delete so
-- removing a checklist template doesn't orphan its tests.
-- =========================================================================

ALTER TABLE checks
  ADD COLUMN IF NOT EXISTS checklist_template_id INTEGER
  REFERENCES checklist_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_checks_checklist_template
  ON checks(checklist_template_id);

ALTER TABLE check_results
  ADD COLUMN IF NOT EXISTS checklist_template_id INTEGER
  REFERENCES checklist_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_check_results_checklist_template
  ON check_results(checklist_template_id);
