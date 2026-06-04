-- =========================================================================
-- Phase 2 — Compliance graph: frameworks, controls, control_links, checks
-- Driven by SWiSH ECS PDF §6, §9, §14.2 (control-centric compliance graph)
-- =========================================================================

-- Frameworks (ISO 22000, HACCP, Civil Defense KW, …) ----------------------

CREATE TABLE IF NOT EXISTS frameworks (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(40)  UNIQUE NOT NULL,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  category        VARCHAR(80),     -- 'Food Safety' | 'HSE' | 'Quality' | 'Legal' | …
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  activated_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  activated_at    TIMESTAMPTZ,
  owner_user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_frameworks_updated_at ON frameworks;
CREATE TRIGGER trg_frameworks_updated_at
  BEFORE UPDATE ON frameworks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Controls (the center of gravity per PDF §14.2) --------------------------

CREATE TABLE IF NOT EXISTS controls (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(40) UNIQUE,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  framework_id    INTEGER REFERENCES frameworks(id) ON DELETE SET NULL,
  category        VARCHAR(80),
  owner_user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  -- Derived health, recomputed by recompute_control_health(). Allowed values:
  --   'healthy' | 'at_risk' | 'failing' | 'unknown'
  health_status   VARCHAR(20) NOT NULL DEFAULT 'unknown',
  health_updated_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_controls_framework ON controls(framework_id);
CREATE INDEX IF NOT EXISTS idx_controls_health    ON controls(health_status);

DROP TRIGGER IF EXISTS trg_controls_updated_at ON controls;
CREATE TRIGGER trg_controls_updated_at
  BEFORE UPDATE ON controls
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Polymorphic links from a control to other governed records --------------

CREATE TABLE IF NOT EXISTS control_links (
  id           SERIAL PRIMARY KEY,
  control_id   INTEGER NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  entity_type  VARCHAR(40) NOT NULL,
    -- 'sop' | 'document' | 'audit' | 'check' | 'capa'
  entity_id    INTEGER NOT NULL,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(control_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_control_links_entity ON control_links(entity_type, entity_id);

-- Checks (Tests) ----------------------------------------------------------
-- Validation logic against a control, run on a frequency.

CREATE TABLE IF NOT EXISTS checks (
  id             SERIAL PRIMARY KEY,
  code           VARCHAR(40) UNIQUE,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  control_id     INTEGER REFERENCES controls(id) ON DELETE SET NULL,
  owner_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  frequency      VARCHAR(30) NOT NULL DEFAULT 'monthly',
    -- 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'on_demand'
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  -- Cached latest result so list pages don't need a window function.
  last_status    VARCHAR(20),    -- 'passing' | 'failing' | 'pending_review' | 'accepted_risk' | NULL
  last_result_at TIMESTAMPTZ,
  next_due_date  DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_checks_control ON checks(control_id);
CREATE INDEX IF NOT EXISTS idx_checks_status  ON checks(last_status);

DROP TRIGGER IF EXISTS trg_checks_updated_at ON checks;
CREATE TRIGGER trg_checks_updated_at
  BEFORE UPDATE ON checks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Append-only check results -----------------------------------------------

CREATE TABLE IF NOT EXISTS check_results (
  id            SERIAL PRIMARY KEY,
  check_id      INTEGER NOT NULL REFERENCES checks(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL,
    -- 'passing' | 'failing' | 'pending_review' | 'accepted_risk'
  notes         TEXT,
  evidence_url  TEXT,
  performed_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_check_results_check ON check_results(check_id, created_at DESC);
