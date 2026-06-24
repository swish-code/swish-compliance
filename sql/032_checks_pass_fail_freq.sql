-- =========================================================================
-- Free-form pass/fail criteria + the original frequency label that the
-- auditor's spreadsheet ships with each test. Why three columns:
--
--   * pass_criteria / fail_criteria — the spreadsheet expresses these as
--     full sentences ("Evidence exists, is current, complete, and reviewed
--     by the assigned owner."), too long for a flag and too domain-specific
--     for a shared lookup. TEXT keeps them human-readable.
--
--   * frequency_label — checks.frequency is a tight enum so existing
--     scheduling logic stays predictable. The spreadsheet, though, carries
--     human cadences like "Monthly / Quarterly" or "Per release / Monthly".
--     We map to the enum at ingest, and stash the full label here so the
--     UI can render the auditor's exact wording.
-- =========================================================================

ALTER TABLE checks
  ADD COLUMN IF NOT EXISTS pass_criteria   TEXT,
  ADD COLUMN IF NOT EXISTS fail_criteria   TEXT,
  ADD COLUMN IF NOT EXISTS frequency_label TEXT;
