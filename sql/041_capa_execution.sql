-- =========================================================================
-- CAPA execution model (per user spec):
--
--   Owner completion fields — root_cause, corrective_action_taken,
--   preventive_action_taken, completion_note. Filled by the assignee
--   while working the CAPA; kept SEPARATE from resolution_note (which
--   the reviewer sees on submit) and assignment_note (captured at
--   assignment time by compliance).
--
--   rejection_reason — set by the reviewer when they reject a
--   submitted CAPA. Explains what has to be fixed before resubmit.
--
--   capa_evidences (many:1) — "CAPA Evidence": the files the OWNER
--   uploads to prove the fix. Distinct from audit_responses.evidence_url
--   (the "Auditor Evidence" that proved the finding existed). Storing
--   in a child table because the owner may need to upload multiple
--   photos / a video plus a document; one column can't hold that.
--   Same shape as audit_attachments (migration 039).
-- =========================================================================

ALTER TABLE corrective_actions
  ADD COLUMN IF NOT EXISTS root_cause               TEXT,
  ADD COLUMN IF NOT EXISTS corrective_action_taken  TEXT,
  ADD COLUMN IF NOT EXISTS preventive_action_taken  TEXT,
  ADD COLUMN IF NOT EXISTS completion_note          TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason         TEXT;

CREATE TABLE IF NOT EXISTS capa_evidences (
  id           SERIAL PRIMARY KEY,
  capa_id      INTEGER NOT NULL REFERENCES corrective_actions(id) ON DELETE CASCADE,
  file_url     TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_mime    VARCHAR(120),
  file_size    INTEGER,
  uploaded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capa_evidences_capa
  ON capa_evidences(capa_id, uploaded_at DESC);
