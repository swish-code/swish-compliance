-- =========================================================================
-- Backfill sops.home_domain_id (added by 045) for SOPs whose domain is
-- known precisely via domains.sop_id (added by 046), instead of the
-- department-name guess 045 used. This is the SOP_GRC_Department_Branch
-- workbook data (Customer Experience Division): each SOP names its domain
-- directly, so there is no need to infer it from a department → domain
-- lookup table that doesn't cover these departments yet.
--
-- A SOP can have more than one domain (CC-SOP-003 has a Customer Care
-- branch and a Complaints Operations branch — see migration 046's
-- comment). "Home domain" is singular by design (045), so we prefer the
-- domain whose OWN department matches the SOP's owning department, and
-- fall back to any one domain when the SOP's department has no domain of
-- its own (CC-SOP-004 is owned by Customer Care but its only domain,
-- DOM-COP-REF, belongs to Complaints Operations — a legitimate pairing
-- established when audit scoping was designed).
--
-- Only fills NULLs, same as 045, so a manual override survives redeploys.
-- =========================================================================

UPDATE sops s
SET home_domain_id = picked.domain_id
FROM (
  SELECT DISTINCT ON (d.sop_id)
    d.sop_id, d.id AS domain_id
  FROM domains d
  WHERE d.sop_id IS NOT NULL
  ORDER BY
    d.sop_id,
    -- Prefer the domain that belongs to the SOP's own department.
    (d.department_id = (SELECT department_id FROM sops WHERE id = d.sop_id)) DESC,
    d.id
) picked
WHERE s.id = picked.sop_id
  AND s.home_domain_id IS NULL;
