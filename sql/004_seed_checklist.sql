-- =========================================================================
-- RETIRED (2026-08-09, user decision): seeded a demo "Daily Food Safety
-- Walkthrough" checklist template + 10 items so /audits wasn't empty on
-- day one. Retired the same way 006_seed_frameworks.sql was: kept
-- resurrecting after being explicitly deleted from production, because
-- scripts/migrate.mjs re-applies every sql/*.sql file on every deploy.
-- Content replaced with a no-op, numbering kept intact. See also
-- 022_seed_checklist_items.sql, retired for the same reason.
-- =========================================================================
SELECT 1;
