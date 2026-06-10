-- =========================================================================
-- SOP Acknowledgments
-- Captures that a user has read & understood an approved SOP. Used to
-- compute "X% of the relevant team has acknowledged the new SOP" and to
-- gate "I've read it" buttons on the SOP detail page.
--
-- A single user can only acknowledge a given SOP once - the UNIQUE
-- constraint enforces that. Acknowledgments survive role changes (we
-- record the role at the time of acknowledgment for the audit trail).
-- =========================================================================

CREATE TABLE IF NOT EXISTS sop_acknowledgments (
  id              SERIAL PRIMARY KEY,
  sop_id          INTEGER NOT NULL REFERENCES sops(id)  ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_role       VARCHAR(40),
  user_agent      VARCHAR(500),
  ip_address      VARCHAR(60),
  UNIQUE (sop_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sop_ack_sop  ON sop_acknowledgments(sop_id);
CREATE INDEX IF NOT EXISTS idx_sop_ack_user ON sop_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_sop_ack_at   ON sop_acknowledgments(acknowledged_at DESC);
