-- =========================================================================
-- Domains — the top layer above frameworks. Each framework belongs to at
-- most one domain (IT / Cybersecurity, HR, ECS Compliance, …). The link
-- is via frameworks.domain_id, nullable so existing frameworks stay valid
-- and the system keeps working even before the seed runs.
-- =========================================================================

CREATE TABLE IF NOT EXISTS domains (
  id           SERIAL PRIMARY KEY,
  code         VARCHAR(40)  NOT NULL UNIQUE,
  name         VARCHAR(200) NOT NULL,
  description  TEXT,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_domains_updated_at ON domains;
CREATE TRIGGER trg_domains_updated_at
  BEFORE UPDATE ON domains
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE frameworks
  ADD COLUMN IF NOT EXISTS domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_frameworks_domain ON frameworks(domain_id);
