-- =========================================================================
-- audits.template_id is no longer required at creation. The new audit
-- flow drops the "pick a checklist template" step entirely; the items
-- the auditor sees come from check_checklist_items keyed off the tests
-- selected in the scope picker (Domain → Framework → Control → Tests).
--
-- The column stays around — historical audits that were created against
-- a single template still reference it, and the audit detail page falls
-- back to the template's items when no tests are linked.
-- =========================================================================

ALTER TABLE audits ALTER COLUMN template_id DROP NOT NULL;
