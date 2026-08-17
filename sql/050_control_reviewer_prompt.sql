-- =========================================================================
-- controls.reviewer_prompt — the workbook's "REVIEWER PROMPT / WHAT TO ASK
-- FOR" per control: a short, control-specific instruction naming the exact
-- sample, case, file, SLA record or approval the reviewer should request.
--
-- Distinct from the columns that already exist:
--   * evidence_required (018) describes WHAT evidence supports the control.
--   * checks.procedure_steps describes HOW a test is executed.
--   * reviewer_prompt is what the reviewer ASKS THE DEPARTMENT FOR before
--     either of those can happen — the opening move of the review.
-- Folding it into evidence_required would lose that distinction and mix
-- an instruction to a person with a description of a record.
-- =========================================================================

ALTER TABLE controls
  ADD COLUMN IF NOT EXISTS reviewer_prompt TEXT;
