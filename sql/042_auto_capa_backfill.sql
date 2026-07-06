-- =========================================================================
-- Auto-CAPA rule (per user spec): every failed audit question MUST have
-- a corrective action. Going forward submitAuditAction creates them at
-- submit time; this migration backfills the failed findings of already
-- submitted/closed audits that never got one.
--
-- Idempotent: the NOT EXISTS anti-join means re-runs insert nothing
-- (the migration runner executes every file on every deploy).
--
-- Created rows are 'open' and unassigned so they surface on /capa as
-- "Not Assigned" and count against the compliance score until someone
-- assigns and resolves them. Severity: critical questions → critical,
-- everything else → medium (overwritten at assignment time).
-- Codes continue each audit's CAPA-AUD<id>-NNN sequence.
-- =========================================================================

INSERT INTO corrective_actions
  (code, title, severity, source_audit_id, source_item_id,
   brand_id, department_id, status)
SELECT
  'CAPA-AUD' || x.audit_id || '-' || LPAD((x.base + x.rn)::text, 3, '0'),
  LEFT(x.question, 250),
  CASE WHEN x.is_critical THEN 'critical' ELSE 'medium' END,
  x.audit_id, x.item_id, x.brand_id, x.department_id, 'open'
FROM (
  SELECT a.id AS audit_id, i.id AS item_id, i.question, i.is_critical,
         a.brand_id, a.department_id,
         ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY i.sort_order, i.id) AS rn,
         (SELECT COUNT(*) FROM corrective_actions ca
          WHERE ca.source_audit_id = a.id) AS base
  FROM audits a
  JOIN audit_responses r ON r.audit_id = a.id AND r.response = 'fail'
  JOIN checklist_items i ON i.id = r.item_id
  WHERE a.status IN ('submitted','closed')
    AND NOT EXISTS (SELECT 1 FROM corrective_actions ca
                    WHERE ca.source_audit_id = a.id
                      AND ca.source_item_id = i.id)
) x;
