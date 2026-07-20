-- Seed reference data (idempotent)

INSERT INTO brands (name) VALUES
  ('Verdi'),
  ('Ordable'),
  ('Mishmash'),
  ('Swish Catering')
ON CONFLICT (name) DO NOTHING;

-- Legacy bootstrap departments. GUARDED so it only fires on a completely
-- empty departments table (fresh DB). The real org is the Division→Department
-- structure (migration 043 + consolidation); without this guard, deleting a
-- consolidated duplicate (e.g. "HR", "IT") let this re-create it unassigned
-- on the next deploy (user-reported 2026-07-09).
INSERT INTO departments (name)
SELECT v.name FROM (VALUES
  ('Quality'), ('Operations'), ('Kitchen'), ('Front of House'),
  ('Procurement'), ('HR'), ('Finance'), ('IT')
) v(name)
WHERE NOT EXISTS (SELECT 1 FROM departments)
ON CONFLICT (name) DO NOTHING;
