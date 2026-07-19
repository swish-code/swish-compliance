-- =========================================================================
-- Phase 1 — user ↔ domain mapping (access scoping by Department + Domain).
-- Mirrors user_brands / user_departments (sql/007). Non-privileged users
-- (not admin/compliance/business_excellence) only see the domains they are
-- mapped to here, in addition to their department scope.
-- =========================================================================

CREATE TABLE IF NOT EXISTS user_domains (
  user_id     INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  domain_id   INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, domain_id)
);
CREATE INDEX IF NOT EXISTS idx_user_domains_domain ON user_domains(domain_id);
