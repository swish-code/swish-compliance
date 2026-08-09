-- =========================================================================
-- Generic delete backup for the admin "Delete" button (SOPs, Domains,
-- Frameworks, Controls, Checklist templates, Audits, CAPAs).
--
-- One row per deleted entity, snapshotting the row itself as JSONB before
-- it's removed. A single generic table rather than one backup table per
-- entity type: the admin delete action is the same shape for all seven
-- entities (fetch row -> snapshot -> delete -> log), so one table keeps
-- that symmetry instead of multiplying near-identical schemas.
--
-- Not an FK-enforced audit trail — entity_id has no FK because the table
-- it pointed at may itself be gone. deleted_by is nullable for the same
-- reason (ON DELETE SET NULL) rather than blocking a user delete on their
-- own past deletions.
-- =========================================================================

CREATE TABLE IF NOT EXISTS deleted_records (
  id           SERIAL PRIMARY KEY,
  entity_type  VARCHAR(40) NOT NULL,
    -- 'sop' | 'domain' | 'framework' | 'control' | 'checklist_template'
    -- | 'audit' | 'capa'
  entity_id    INTEGER NOT NULL,
  snapshot     JSONB NOT NULL,
  deleted_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  deleted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deleted_records_entity
  ON deleted_records(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_deleted_records_deleted_at
  ON deleted_records(deleted_at DESC);
