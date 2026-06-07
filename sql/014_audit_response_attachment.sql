-- =========================================================================
-- Audit responses — let the auditor attach a real file (PDF / Word / Excel /
-- image) per checklist item instead of pasting a URL. evidence_url now
-- carries a base64 data URL; these two columns store the original filename
-- and MIME so the UI renders a proper download link with an icon.
-- =========================================================================

ALTER TABLE audit_responses
  ADD COLUMN IF NOT EXISTS evidence_name VARCHAR(255);

ALTER TABLE audit_responses
  ADD COLUMN IF NOT EXISTS evidence_mime VARCHAR(120);
