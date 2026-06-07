-- =========================================================================
-- Notifications center. One row per (recipient, event). The notification
-- service fans out a single event to many recipients by inserting one
-- row per audience member.
-- =========================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Who triggered the event (snapshot — survives if the actor changes role)
  actor_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name   VARCHAR(255),
  actor_role   VARCHAR(40),

  -- What happened
  kind         VARCHAR(80)  NOT NULL,
    -- e.g. 'sop:pending_compliance', 'capa:submitted', 'audit:critical', …
  title        TEXT         NOT NULL,
  body         TEXT,
  severity     VARCHAR(20)  NOT NULL DEFAULT 'info',
    -- 'info' | 'success' | 'warning' | 'critical'

  -- Where to go when clicked
  entity_type  VARCHAR(40),
  entity_id    INTEGER,
  href         TEXT,

  -- Read state
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at      TIMESTAMPTZ,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_unread
  ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_user_created
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_entity
  ON notifications(entity_type, entity_id);
