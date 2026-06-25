-- =========================================================================
-- Audit attachments — many files (photos, PDFs, docs) per audit, attached
-- from the Submit-audit area. Separate from audit_responses.evidence_url
-- which is per-item evidence; this table covers audit-level artefacts
-- (cover letter, signed report, supporting photos that don't tie to a
-- single question).
--
-- File contents are stored as base64 data URLs in file_url (same shape
-- as the other attachment columns in this app — keeps deploys
-- self-contained without provisioning object storage). The size column
-- helps the UI warn users near the limit without re-decoding the URL.
-- =========================================================================

CREATE TABLE IF NOT EXISTS audit_attachments (
  id           SERIAL PRIMARY KEY,
  audit_id     INTEGER NOT NULL REFERENCES audits(id)  ON DELETE CASCADE,
  file_url     TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_mime    VARCHAR(120),
  file_size    INTEGER,
  uploaded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_attachments_audit
  ON audit_attachments(audit_id, uploaded_at DESC);
