-- =========================================================================
-- Swish Compliance — PostgreSQL schema (idempotent — safe to re-run)
-- =========================================================================

-- Reference tables ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS brands (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) UNIQUE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) UNIQUE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  display_name    VARCHAR(255) NOT NULL,
  role            VARCHAR(40)  NOT NULL DEFAULT 'viewer',
    -- 'admin' | 'business_excellence' | 'compliance' | 'auditor' | 'branch_manager' | 'viewer'
  brand_id        INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  department_id   INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- SOPs ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sops (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(40) UNIQUE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  version         VARCHAR(20) NOT NULL DEFAULT '1.0',
  status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    -- 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived'
  file_url        TEXT,
  brand_id        INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  department_id   INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  owner_id        INTEGER REFERENCES users(id)   ON DELETE SET NULL,
  created_by      INTEGER REFERENCES users(id)   ON DELETE SET NULL,
  approved_by     INTEGER REFERENCES users(id)   ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  effective_date  DATE,
  review_date     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sops_status      ON sops(status);
CREATE INDEX IF NOT EXISTS idx_sops_brand       ON sops(brand_id);
CREATE INDEX IF NOT EXISTS idx_sops_department  ON sops(department_id);

-- SOP version history -----------------------------------------------------

CREATE TABLE IF NOT EXISTS sop_versions (
  id          SERIAL PRIMARY KEY,
  sop_id      INTEGER NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
  version     VARCHAR(20) NOT NULL,
  changed_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  change_note TEXT,
  snapshot    JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sop_versions_sop ON sop_versions(sop_id);

-- Audit log ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_email  VARCHAR(255),
  action      VARCHAR(80) NOT NULL,
  entity      VARCHAR(60),
  entity_id   INTEGER,
  details     JSONB,
  ip_address  VARCHAR(60),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user    ON audit_logs(user_id);

-- updated_at trigger for sops ---------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sops_updated_at ON sops;
CREATE TRIGGER trg_sops_updated_at
  BEFORE UPDATE ON sops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
