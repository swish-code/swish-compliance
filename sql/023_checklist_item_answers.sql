-- =========================================================================
-- Quick per-item Yes/No answers — recorded directly from a checklist
-- template page (NOT a formal audit). Append-only history; the page
-- shows the most recent answer per item via a DISTINCT ON query.
--
-- Why a separate table rather than overloading audit_responses:
--   audit_responses requires a parent audit row (with auditor, brand,
--   department, audit_date). The user wanted a lightweight "user + date"
--   flow with no audit ceremony. Keeping the two paths separate also
--   keeps formal audit history clean — these quick answers don't pollute
--   the audit reports.
-- =========================================================================

CREATE TABLE IF NOT EXISTS checklist_item_answers (
  id            SERIAL PRIMARY KEY,
  item_id       INTEGER     NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  answer        VARCHAR(10) NOT NULL,
    -- 'yes' | 'no' | 'na'
  note          TEXT,
  answered_by   INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  answered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cia_item_latest
  ON checklist_item_answers(item_id, answered_at DESC);

CREATE INDEX IF NOT EXISTS idx_cia_user
  ON checklist_item_answers(answered_by);
