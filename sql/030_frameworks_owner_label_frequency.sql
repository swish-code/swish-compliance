-- =========================================================================
-- Two free-text columns on frameworks so we can store the source-of-truth
-- Owner (e.g. "IT Security / IT Manager") and Audit Frequency
-- (e.g. "Monthly / Quarterly") that the auditor's spreadsheet carries.
--
-- Why not reuse owner_user_id:
--   owner_user_id is an FK to users — fine when the owner is a specific
--   account in the system. The spreadsheet labels are roles/teams, not
--   accounts, so they don't fit there. Keeping them as plain text lets
--   the spreadsheet round-trip cleanly without inventing fake users.
-- =========================================================================

ALTER TABLE frameworks
  ADD COLUMN IF NOT EXISTS owner_label     TEXT,
  ADD COLUMN IF NOT EXISTS audit_frequency TEXT;
