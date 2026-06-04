-- =========================================================================
-- Phase 1 — Audit Core: checklists, audits, corrective actions, evidence
-- (idempotent — safe to re-run)
-- =========================================================================

-- Checklist templates -----------------------------------------------------

CREATE TABLE IF NOT EXISTS checklist_templates (
  id           SERIAL PRIMARY KEY,
  code         VARCHAR(40)  UNIQUE,
  name         VARCHAR(200) NOT NULL,
  description  TEXT,
  category     VARCHAR(80),
    -- e.g. 'Food Safety', 'Fire Safety', 'Customer Experience', 'HR'
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_checklist_tpl_active   ON checklist_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_checklist_tpl_category ON checklist_templates(category);

DROP TRIGGER IF EXISTS trg_checklist_tpl_updated_at ON checklist_templates;
CREATE TRIGGER trg_checklist_tpl_updated_at
  BEFORE UPDATE ON checklist_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Checklist items (questions / criteria) ----------------------------------

CREATE TABLE IF NOT EXISTS checklist_items (
  id            SERIAL PRIMARY KEY,
  template_id   INTEGER NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  question      TEXT NOT NULL,
  guidance      TEXT,
  weight        INTEGER NOT NULL DEFAULT 1,    -- score weighting (1-10 typical)
  is_critical   BOOLEAN NOT NULL DEFAULT FALSE, -- critical fails block passing
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_checklist_items_tpl ON checklist_items(template_id, sort_order);

-- Audits (a single execution of a template) -------------------------------

CREATE TABLE IF NOT EXISTS audits (
  id               SERIAL PRIMARY KEY,
  template_id      INTEGER NOT NULL REFERENCES checklist_templates(id) ON DELETE RESTRICT,
  brand_id         INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  department_id    INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  location         VARCHAR(200),
    -- free-text location label (we don't have a `locations` table yet)
  auditor_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  audit_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  status           VARCHAR(30) NOT NULL DEFAULT 'in_progress',
    -- 'in_progress' | 'submitted' | 'closed'
  score            NUMERIC(5,2),       -- computed % at submission time
  max_score        INTEGER,            -- sum of weights of answered items
  critical_failed  INTEGER DEFAULT 0,  -- count of critical items marked fail
  summary          TEXT,
  submitted_at     TIMESTAMPTZ,
  closed_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audits_status    ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_date      ON audits(audit_date DESC);
CREATE INDEX IF NOT EXISTS idx_audits_brand     ON audits(brand_id);
CREATE INDEX IF NOT EXISTS idx_audits_auditor   ON audits(auditor_id);

DROP TRIGGER IF EXISTS trg_audits_updated_at ON audits;
CREATE TRIGGER trg_audits_updated_at
  BEFORE UPDATE ON audits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit responses (one row per checklist_item per audit) ------------------

CREATE TABLE IF NOT EXISTS audit_responses (
  id           SERIAL PRIMARY KEY,
  audit_id     INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  item_id      INTEGER NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  response     VARCHAR(10),         -- 'pass' | 'fail' | 'na'
  notes        TEXT,
  evidence_url TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(audit_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_responses_audit ON audit_responses(audit_id);

DROP TRIGGER IF EXISTS trg_responses_updated_at ON audit_responses;
CREATE TRIGGER trg_responses_updated_at
  BEFORE UPDATE ON audit_responses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Corrective Actions (CAPA) -----------------------------------------------

CREATE TABLE IF NOT EXISTS corrective_actions (
  id               SERIAL PRIMARY KEY,
  code             VARCHAR(40) UNIQUE,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  severity         VARCHAR(20) NOT NULL DEFAULT 'medium',
    -- 'low' | 'medium' | 'high' | 'critical'
  status           VARCHAR(30) NOT NULL DEFAULT 'open',
    -- 'open' | 'in_progress' | 'submitted' | 'verified' | 'closed' | 'rejected'
  source_audit_id  INTEGER REFERENCES audits(id) ON DELETE SET NULL,
  source_item_id   INTEGER REFERENCES checklist_items(id) ON DELETE SET NULL,
  brand_id         INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  department_id    INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  assigned_to      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verified_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  due_date         DATE,
  resolution_note  TEXT,
  evidence_url     TEXT,
  submitted_at     TIMESTAMPTZ,
  verified_at      TIMESTAMPTZ,
  closed_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_capa_status   ON corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_capa_assignee ON corrective_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_capa_due      ON corrective_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_capa_audit    ON corrective_actions(source_audit_id);

DROP TRIGGER IF EXISTS trg_capa_updated_at ON corrective_actions;
CREATE TRIGGER trg_capa_updated_at
  BEFORE UPDATE ON corrective_actions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Evidence files (polymorphic, links to any entity) -----------------------

CREATE TABLE IF NOT EXISTS evidence_files (
  id           SERIAL PRIMARY KEY,
  entity_type  VARCHAR(40) NOT NULL,
    -- 'sop' | 'audit' | 'audit_response' | 'capa' | 'assignment' | 'kpi'
  entity_id    INTEGER NOT NULL,
  file_name    VARCHAR(255) NOT NULL,
  file_url     TEXT NOT NULL,
  description  TEXT,
  uploaded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evidence_entity ON evidence_files(entity_type, entity_id);
