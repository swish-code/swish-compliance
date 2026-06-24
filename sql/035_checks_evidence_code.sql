-- =========================================================================
-- evidence_code on checks. The auditor's framework.xlsx ships an
-- EVD-IT-0001 / EVD-HR-0024-style ID for the piece of evidence each test
-- should collect, separate from the free-text "what to bring"
-- description that already lives in evidence_needed (migration 018).
--
-- Stored as plain text rather than an FK to a new evidence_library table:
-- the spreadsheet has one EVD code per test and never re-uses a code
-- across tests, so a separate entity adds joins without buying anything.
-- =========================================================================

ALTER TABLE checks
  ADD COLUMN IF NOT EXISTS evidence_code TEXT;
