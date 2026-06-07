-- =========================================================================
-- SOP workflow v2 — 4-stage approval (DM → Compliance → BE → CEO)
-- + rename role 'branch_manager' to 'department_manager'
-- =========================================================================

-- 1) Rename the role on existing users (idempotent — no-op if already done).
UPDATE users SET role = 'department_manager' WHERE role = 'branch_manager';

-- 2) Re-map legacy SOP statuses to the new workflow vocabulary.
--    pending_review → pending_compliance   (now the first reviewer is Compliance)
--    rejected       → returned_to_dm       (back to the Department Manager)
--    draft / approved / archived stay as they are.
UPDATE sops SET status = 'pending_compliance' WHERE status = 'pending_review';
UPDATE sops SET status = 'returned_to_dm'    WHERE status = 'rejected';
