-- =========================================================================
-- SOP-first audit scoping.
--
-- The new /audits/new flow starts from the Policy (SOP) and derives
-- everything below it automatically:
--
--     SOP → Scope Type → (Domain) → (Framework) → Controls → Tests
--         → Checklists → Questions
--
-- Two things were missing to make that traversal possible:
--
--   1. Domains and Frameworks carry a "RELATED SOP" in the source
--      workbook, but the importer could only store it as free text
--      (frameworks.reference_source). Without a real FK there is no way
--      to answer "which domains belong to CC-SOP-003?" in SQL. The
--      controls→sop edge already exists via control_links, but starting
--      the walk from controls loses the domain/framework grouping that
--      the scope picker has to show.
--
--   2. A domain/framework belongs to one department. A single SOP can
--      span several (CC-SOP-003 has a Customer Care branch AND a
--      Complaints Operations branch), and the business rule is that each
--      department gets its OWN audit. Without department_id here, a
--      "Full SOP" audit for Customer Care would wrongly pull in the
--      Complaints Operations questions.
--
-- Both columns are nullable single FKs, mirroring the source data where
-- each domain/framework names exactly one SOP and one department. If a
-- future dataset needs many-to-many, this becomes a junction table —
-- nothing in the app assumes the cardinality beyond "at most one".
-- =========================================================================

ALTER TABLE domains
  ADD COLUMN IF NOT EXISTS sop_id        INTEGER REFERENCES sops(id)        ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_domains_sop  ON domains(sop_id);
CREATE INDEX IF NOT EXISTS idx_domains_dept ON domains(department_id);

ALTER TABLE frameworks
  ADD COLUMN IF NOT EXISTS sop_id        INTEGER REFERENCES sops(id)        ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_frameworks_sop  ON frameworks(sop_id);
CREATE INDEX IF NOT EXISTS idx_frameworks_dept ON frameworks(department_id);

-- ── Audits ───────────────────────────────────────────────────────────────
-- scope_type records HOW the audit was scoped, so the detail page can
-- explain itself ("Framework Audit") and so a re-run can reproduce the
-- same selection. Nullable: audits created before this migration were
-- scoped control-by-control and have no equivalent.
--
--   'full_sop'  — every domain/framework/control under the SOP, limited
--                 to the audited department.
--   'framework' — one framework under the SOP. The default.
--   'domain'    — every framework under one domain. Broad; discouraged.
--
-- auditee_id / reviewer_id complete the cast around an audit:
--   auditor_id  — already exists, the audit's creator
--   assigned_to — already exists, whoever actually runs it
--   auditee_id  — the department's representative who supplies evidence
--   reviewer_id — optional approver who signs the result off
ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS scope_type  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS auditee_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS objective   TEXT,
  ADD COLUMN IF NOT EXISTS notes       TEXT;

CREATE INDEX IF NOT EXISTS idx_audits_auditee  ON audits(auditee_id);
CREATE INDEX IF NOT EXISTS idx_audits_reviewer ON audits(reviewer_id);
