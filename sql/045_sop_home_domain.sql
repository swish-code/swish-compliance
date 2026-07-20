-- =========================================================================
-- SOP home domain (user spec 2026-07-09): each SOP belongs to exactly ONE
-- domain for cross-reference display, instead of appearing under every
-- domain the workbook loosely links it to (which put e.g. Complaints
-- Validation + Product Tasting under Customer Care).
--
-- The home domain is derived from the SOP's OWNING DEPARTMENT (the most
-- accurate single signal — e.g. OPEXN-SOP-001 is owned by Complaints
-- Operations, PT-SOP-001 by R&D → Product Development). Populated only
-- where NULL so manual overrides on the SOP survive later deploys.
-- =========================================================================

ALTER TABLE sops
  ADD COLUMN IF NOT EXISTS home_domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sops_home_domain ON sops(home_domain_id);

UPDATE sops s
SET home_domain_id = dm.id
FROM departments d
JOIN (VALUES
  ('Customer Care',                  'DOM-CC'),
  ('Complaints Operations',          'DOM-CO'),
  ('Central Production Unit',        'DOM-PROD'),
  ('Central Bakery Unit',            'DOM-PROD'),
  ('Integrated Business Excellence', 'DOM-IBE'),
  ('Operation Excellence',           'DOM-OPEX'),
  ('Auditing',                       'DOM-OPEX'),
  ('GRC',                            'DOM-COMP'),
  ('Learning & Development',          'DOM-LD'),
  ('Admin & Government Formalities',  'DOM-GF'),
  ('Transportation & Accommodation',  'DOM-GF'),
  ('Information Technology',          'DOM-IT'),
  ('Maintenance',                    'DOM-MAINT'),
  ('Property & Leasing',             'DOM-FACM'),
  ('Human Resources',                'DOM-HR'),
  ('Cost Control',                   'DOM-COST'),
  ('Accounting',                     'DOM-FIN'),
  ('Procurement',                    'DOM-PROC'),
  ('Warehouse & Logistics',          'DOM-WL'),
  ('Research & Development',          'DOM-PD'),
  ('Brand Marketing',                'DOM-MKT'),
  ('Growth Marketing',               'DOM-MKT'),
  ('Fleet',                          'DOM-WL')
) map(dept_name, domain_code) ON map.dept_name = d.name
JOIN domains dm ON dm.code = map.domain_code
WHERE s.department_id = d.id
  AND s.home_domain_id IS NULL;
