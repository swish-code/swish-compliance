-- =========================================================================
-- Domain review guidance — four columns carrying the "how do I actually
-- audit this domain" content the SOP_GRC workbook ships per domain:
--
--   review_scope_method  — DOMAIN REVIEW SCOPE & METHOD: how to sample and
--                          what to compare the sample against.
--   evidence_to_obtain   — GO TO / OBTAIN: the artefacts to collect first.
--   review_focus         — REVIEW: the specific themes being judged.
--   how_to_verify        — HOW TO VERIFY: the verification sequence.
--
-- Kept as four separate TEXT columns rather than appended into
-- domains.description: description is the short "what is this domain"
-- blurb rendered on cards and in dropdowns, and folding several
-- paragraphs of audit procedure into it would wreck every list view.
-- All nullable — domains created by hand from /domains/new have none.
-- =========================================================================

ALTER TABLE domains
  ADD COLUMN IF NOT EXISTS review_scope_method TEXT,
  ADD COLUMN IF NOT EXISTS evidence_to_obtain  TEXT,
  ADD COLUMN IF NOT EXISTS review_focus        TEXT,
  ADD COLUMN IF NOT EXISTS how_to_verify       TEXT;
