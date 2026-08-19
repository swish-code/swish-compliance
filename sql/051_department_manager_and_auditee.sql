-- =========================================================================
-- Department managers + a free-text override for the audit auditee.
--
--   * departments.manager_id — the single user who represents this
--     department (user spec 2026-08-19). Used to default the
--     "Department Representative / Auditee" field when creating an
--     audit for this department, and shown in Admin > Departments.
--
--   * audits.auditee_custom_name — lets the auditor type a name instead
--     of picking a system user, for cases where the actual point of
--     contact isn't (yet) a user in the system. When set, it takes
--     priority over auditee_id in the AUDIT_SELECT COALESCE.
-- =========================================================================

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_departments_manager ON departments(manager_id);

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS auditee_custom_name VARCHAR(200);
