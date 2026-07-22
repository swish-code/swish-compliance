BEGIN;

-- ============ 1) De-duplicate QUESTIONS within each checklist ============
-- Keep the lowest-id row per (template_id, normalized question text);
-- re-point the losers' test links onto the kept row, then delete losers.
CREATE TEMP TABLE q_dups ON COMMIT DROP AS
SELECT id,
       FIRST_VALUE(id) OVER (PARTITION BY template_id, lower(btrim(question)) ORDER BY id) AS keep_id,
       ROW_NUMBER()    OVER (PARTITION BY template_id, lower(btrim(question)) ORDER BY id) AS rn
FROM checklist_items;

-- move loser question -> kept question in the test-link junction
INSERT INTO check_checklist_items (check_id, checklist_item_id)
SELECT cci.check_id, d.keep_id
FROM check_checklist_items cci
JOIN q_dups d ON d.id = cci.checklist_item_id AND d.rn > 1
ON CONFLICT DO NOTHING;

-- delete the duplicate question rows (their cci rows cascade)
DELETE FROM checklist_items WHERE id IN (SELECT id FROM q_dups WHERE rn > 1);

-- resequence sort_order 1..N inside every affected template
WITH seq AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY template_id ORDER BY sort_order, id) AS rn
  FROM checklist_items
)
UPDATE checklist_items i SET sort_order = seq.rn FROM seq WHERE i.id = seq.id;

-- ============ 2) Merge the 2 duplicate frameworks ============
-- Keep the framework with more controls; repoint controls + audits, delete loser.
-- FW-020 -> FW-002 ; FW-OPEX-SOPLC -> FW-OPEX-SLG
CREATE TEMP TABLE fw_merge (loser text, keeper text) ON COMMIT DROP;
INSERT INTO fw_merge VALUES ('FW-020','FW-002'), ('FW-OPEX-SOPLC','FW-OPEX-SLG');

UPDATE controls c SET framework_id = k.id
FROM fw_merge m JOIN frameworks l ON l.code = m.loser JOIN frameworks k ON k.code = m.keeper
WHERE c.framework_id = l.id;

UPDATE audits a SET framework_id = k.id
FROM fw_merge m JOIN frameworks l ON l.code = m.loser JOIN frameworks k ON k.code = m.keeper
WHERE a.framework_id = l.id;

DELETE FROM frameworks f USING fw_merge m WHERE f.code = m.loser;

-- ============ VERIFY ============
SELECT (SELECT COUNT(*) FROM (SELECT template_id, lower(btrim(question)) q FROM checklist_items GROUP BY 1,2 HAVING COUNT(*)>1) x) AS remaining_dup_questions,
       (SELECT COUNT(*) FROM (SELECT domain_id, lower(btrim(name)) n FROM frameworks GROUP BY 1,2 HAVING COUNT(*)>1) y) AS remaining_dup_frameworks,
       (SELECT COUNT(*) FROM checklist_items) AS total_questions,
       (SELECT COUNT(*) FROM frameworks) AS total_frameworks;
