-- =========================================================================
-- Schedule and ownership on audits:
--   * start_at / end_at — the planned execution window. Stored as
--     TIMESTAMPTZ so it can carry both date and time across time zones.
--     audit_date is left in place — it's still the "day this audit
--     happened" used by every existing report, and not every audit needs
--     a fine-grained window.
--   * assigned_to — the user who actually has to run this audit. Distinct
--     from auditor_id (which is the *creator* of the audit row). On user
--     deletion we just drop the link, never the audit.
-- All three columns are nullable so historical audits stay valid.
-- =========================================================================

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS start_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audits_assigned_to ON audits(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audits_start_at    ON audits(start_at);
