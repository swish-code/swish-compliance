-- =========================================================================
-- Audits — link each audit to the Policy (an approved SOP) and Framework
-- it audits against. Both are optional so existing audits stay valid and
-- old workflows still work; the New-Audit form just gets two extra
-- dropdowns to capture this context up-front.
-- =========================================================================

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS policy_id     INTEGER REFERENCES sops(id)       ON DELETE SET NULL;

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS framework_id  INTEGER REFERENCES frameworks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audits_policy    ON audits(policy_id);
CREATE INDEX IF NOT EXISTS idx_audits_framework ON audits(framework_id);
