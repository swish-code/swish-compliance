-- =========================================================================
-- CAPA extensions for the audit-driven "Assign CAPA" flow.
--
--   * start_date       — when the corrective action work is expected to
--                         START (distinct from due_date, which is when
--                         it must be finished).
--   * reviewer_id      — the user who will verify/close/reject the CAPA
--                         (Compliance / BE / GRC). Distinct from
--                         verified_by, which is stamped AT verification
--                         time. reviewer_id is the plan; verified_by is
--                         the actual actor.
--   * assignment_note  — free-text note captured at assignment time
--                         (why this person, deadline reasoning, etc.).
--                         separate from resolution_note which is written
--                         when the assignee SUBMITS the completed work.
--
-- All three are nullable so existing CAPAs keep working.
-- =========================================================================

ALTER TABLE corrective_actions
  ADD COLUMN IF NOT EXISTS start_date      DATE,
  ADD COLUMN IF NOT EXISTS reviewer_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_note TEXT;

CREATE INDEX IF NOT EXISTS idx_capa_reviewer ON corrective_actions(reviewer_id);
