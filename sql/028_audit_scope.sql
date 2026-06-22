-- =========================================================================
-- Audit scope: an audit can now pin itself to (domain → framework →
-- control → tests). framework_id was already added in migration 019; we
-- add domain_id and control_id here as nullable siblings, plus a junction
-- (audit_tests) for the multi-select Tests field.
--
-- All four are kept nullable so old audits remain valid; the *form*
-- enforces required-ness, not the DB. Belt-and-braces: even if a future
-- script imports an audit without scope, nothing breaks.
-- =========================================================================

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS domain_id  INTEGER REFERENCES domains(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS control_id INTEGER REFERENCES controls(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audits_domain  ON audits(domain_id);
CREATE INDEX IF NOT EXISTS idx_audits_control ON audits(control_id);

CREATE TABLE IF NOT EXISTS audit_tests (
  audit_id   INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  check_id   INTEGER NOT NULL REFERENCES checks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (audit_id, check_id)
);

CREATE INDEX IF NOT EXISTS idx_audit_tests_audit ON audit_tests(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_tests_check ON audit_tests(check_id);
