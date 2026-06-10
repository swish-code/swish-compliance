-- =========================================================================
-- SOP structured sections — the standard 10 sections of the Universal SOP
-- Template (Purpose, Scope, Process Flow, Roles, Inputs/Outputs, Tools,
-- KPIs, Ownership, Appendices, Signatures). Each is its own TEXT column
-- so they can be searched, displayed in tables, and edited independently
-- without parsing a single blob.
--
-- All columns are nullable: the Bulk Import path populates them from the
-- Word doc, but manual creators can still ship a SOP with just an
-- attachment if they prefer.
-- =========================================================================

ALTER TABLE sops ADD COLUMN IF NOT EXISTS purpose                TEXT;
ALTER TABLE sops ADD COLUMN IF NOT EXISTS scope                  TEXT;
ALTER TABLE sops ADD COLUMN IF NOT EXISTS process_flow           TEXT;
ALTER TABLE sops ADD COLUMN IF NOT EXISTS roles_responsibilities TEXT;
ALTER TABLE sops ADD COLUMN IF NOT EXISTS inputs_outputs         TEXT;
ALTER TABLE sops ADD COLUMN IF NOT EXISTS tools_forms            TEXT;
ALTER TABLE sops ADD COLUMN IF NOT EXISTS kpis                   TEXT;
ALTER TABLE sops ADD COLUMN IF NOT EXISTS ownership_review       TEXT;
ALTER TABLE sops ADD COLUMN IF NOT EXISTS appendices             TEXT;
ALTER TABLE sops ADD COLUMN IF NOT EXISTS signatures_approval    TEXT;
