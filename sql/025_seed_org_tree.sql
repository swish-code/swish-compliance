-- =========================================================================
-- Seed the SWiSH org tree (4 levels) provided by the user. Each insert
-- looks up its parent via the parent's `code`, so we never hard-code IDs
-- and the seed stays portable across environments. Fully idempotent:
-- ON CONFLICT (code) DO UPDATE keeps name/parent/level/sort_order in
-- sync if the seed is re-run after a manual edit.
-- =========================================================================

-- Level 1 — roots --------------------------------------------------------
INSERT INTO org_units (code, name, parent_id, level, sort_order) VALUES
  ('A', 'Centralized', NULL, 1, 1),
  ('B', 'Brand Wise',  NULL, 1, 2)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level, sort_order = EXCLUDED.sort_order;

-- Level 2 — under A (Centralized functions) ------------------------------
INSERT INTO org_units (code, name, parent_id, level, sort_order)
SELECT v.code, v.name, p.id, 2, v.so
FROM (VALUES
  ('A.1', 'HR',                  1),
  ('A.2', 'Finance',             2),
  ('A.3', 'CPU',                 3),
  ('A.4', 'IT',                  4),
  ('A.5', 'Customer Experience', 5)
) AS v(code, name, so)
JOIN org_units p ON p.code = 'A'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level, sort_order = EXCLUDED.sort_order;

-- Level 2 — under B (Brand-wise functions) -------------------------------
INSERT INTO org_units (code, name, parent_id, level, sort_order)
SELECT v.code, v.name, p.id, 2, v.so
FROM (VALUES
  ('B.1', 'Marketing', 1),
  ('B.2', 'Operation', 2)
) AS v(code, name, so)
JOIN org_units p ON p.code = 'B'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level, sort_order = EXCLUDED.sort_order;

-- Level 3 — under A.1 HR -------------------------------------------------
INSERT INTO org_units (code, name, parent_id, level, sort_order)
SELECT v.code, v.name, p.id, 3, v.so
FROM (VALUES
  ('A.1.1', 'Admin',              1),
  ('A.1.2', 'Recruitment',        2),
  ('A.1.3', 'Payroll',            3),
  ('A.1.4', 'Employee Relations', 4)
) AS v(code, name, so)
JOIN org_units p ON p.code = 'A.1'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level, sort_order = EXCLUDED.sort_order;

-- Level 3 — under A.2 Finance --------------------------------------------
INSERT INTO org_units (code, name, parent_id, level, sort_order)
SELECT v.code, v.name, p.id, 3, v.so
FROM (VALUES
  ('A.2.1', 'Accounting',      1),
  ('A.2.2', 'Cost Control',    2),
  ('A.2.3', 'Procurement',     3),
  ('A.2.4', 'Payroll Finance', 4)
) AS v(code, name, so)
JOIN org_units p ON p.code = 'A.2'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level, sort_order = EXCLUDED.sort_order;

-- Level 3 — under A.3 CPU ------------------------------------------------
INSERT INTO org_units (code, name, parent_id, level, sort_order)
SELECT v.code, v.name, p.id, 3, v.so
FROM (VALUES
  ('A.3.1', 'Production',      1),
  ('A.3.2', 'Quality Control', 2),
  ('A.3.3', 'Warehouse',       3),
  ('A.3.4', 'Packing',         4),
  ('A.3.5', 'Dispatch',        5)
) AS v(code, name, so)
JOIN org_units p ON p.code = 'A.3'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level, sort_order = EXCLUDED.sort_order;

-- Level 3 — under A.4 IT -------------------------------------------------
INSERT INTO org_units (code, name, parent_id, level, sort_order)
SELECT v.code, v.name, p.id, 3, v.so
FROM (VALUES
  ('A.4.1', 'Technical Support', 1),
  ('A.4.2', 'Systems',           2)
) AS v(code, name, so)
JOIN org_units p ON p.code = 'A.4'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level, sort_order = EXCLUDED.sort_order;

-- Level 3 — under A.5 Customer Experience --------------------------------
INSERT INTO org_units (code, name, parent_id, level, sort_order)
SELECT v.code, v.name, p.id, 3, v.so
FROM (VALUES
  ('A.5.1', 'Call Center',    1),
  ('A.5.2', 'Technical Team', 2)
) AS v(code, name, so)
JOIN org_units p ON p.code = 'A.5'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level, sort_order = EXCLUDED.sort_order;

-- Level 3 — under B.1 Marketing (per brand) ------------------------------
INSERT INTO org_units (code, name, parent_id, level, sort_order)
SELECT v.code, v.name, p.id, 3, v.so
FROM (VALUES
  ('B.1.1', 'Yelo',          1),
  ('B.1.2', 'Mishmash',      2),
  ('B.1.3', 'BBT',           3),
  ('B.1.4', 'Other Brands',  4)
) AS v(code, name, so)
JOIN org_units p ON p.code = 'B.1'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level, sort_order = EXCLUDED.sort_order;

-- Level 3 — under B.2 Operation (per brand) ------------------------------
INSERT INTO org_units (code, name, parent_id, level, sort_order)
SELECT v.code, v.name, p.id, 3, v.so
FROM (VALUES
  ('B.2.1', 'Yelo',     1),
  ('B.2.2', 'Mishmash', 2),
  ('B.2.3', 'BBT',      3)
) AS v(code, name, so)
JOIN org_units p ON p.code = 'B.2'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level, sort_order = EXCLUDED.sort_order;

-- Level 4 — branches under each Operation brand --------------------------
INSERT INTO org_units (code, name, parent_id, level, sort_order)
SELECT v.code, v.name, p.id, 4, v.so
FROM (VALUES
  ('B.2.1.1', 'Branch 1', 'B.2.1', 1),
  ('B.2.1.2', 'Branch 2', 'B.2.1', 2),
  ('B.2.1.3', 'Branch 3', 'B.2.1', 3),
  ('B.2.2.1', 'Branch 1', 'B.2.2', 1),
  ('B.2.2.2', 'Branch 2', 'B.2.2', 2),
  ('B.2.2.3', 'Branch 3', 'B.2.2', 3),
  ('B.2.3.1', 'Branch 1', 'B.2.3', 1),
  ('B.2.3.2', 'Branch 2', 'B.2.3', 2),
  ('B.2.3.3', 'Branch 3', 'B.2.3', 3)
) AS v(code, name, parent_code, so)
JOIN org_units p ON p.code = v.parent_code
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level, sort_order = EXCLUDED.sort_order;
