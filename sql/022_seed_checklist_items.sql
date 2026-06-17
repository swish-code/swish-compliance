-- =========================================================================
-- Seed: Food / Chemical / Fire / Hygiene checklists (56 items) from the
-- chicklist.xlsx file. Each item has a unique code (CHK-FOO-001 etc.),
-- section, and is linked to a check (test) via the check_checklist_items
-- junction table. Idempotent: ON CONFLICT DO NOTHING on all inserts.
-- =========================================================================

-- 1) Templates (4 distinct: Food Safety, Chemical & Cross Contamination,
--    Fire Safety, Hygiene). Code is derived from the checklist-name prefix.
INSERT INTO checklist_templates (code, name, description, category, is_active) VALUES
  ('TPL-FOOD', 'Food Safety checklist',                 'Storage, temperature, preparation and documentation checks for food safety.', 'Food Safety',  TRUE),
  ('TPL-CHEM', 'Chemical & Cross Contamination checklist', 'Chemical storage and cross-contamination prevention checks.',               'Chemical Safety', TRUE),
  ('TPL-FIRE', 'Fire Safety checklist',                 'Fire protection, emergency route, electrical, gas, sharp tools and kitchen fire risk.', 'Fire Safety', TRUE),
  ('TPL-HYG',  'Hygiene checklist',                    'Handwashing, personal hygiene, cleaning and pest prevention.',              'Hygiene',     TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- 2) Items — one INSERT per row from the source spreadsheet. The (code) unique
--    index makes this safe to re-run.
INSERT INTO checklist_items (template_id, code, sort_order, section, question, weight) VALUES
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-001', 1, 'Storage', 'Food stored according to storage hierarchy', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-002', 2, 'Storage', 'All food products covered and protected', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-003', 3, 'Storage', 'No food stored directly against walls', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-004', 4, 'Storage', 'Minimum clearance from floor maintained', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-005', 5, 'Storage', 'FIFO followed in storage areas, chillers, and stations', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-006', 6, 'Storage', 'Products correctly labeled with production/expiry details', 5),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-007', 7, 'Storage', 'No expired or relabeled products beyond shelf life', 5),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-008', 8, 'Storage', 'No spoiled food, bad odor, slime, or discoloration observed', 5),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-009', 9, 'Temperature', 'Cold holding equipment and food maintained at ≤5°C', 2),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-010', 10, 'Temperature', 'Hot holding food maintained at ≥65°C', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-011', 11, 'Temperature', 'Temperature logs completed in real time, not retrospectively', 2),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-012', 12, 'Temperature', 'Calibrated thermometer available and clean', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-013', 13, 'Preparation', 'Food contact surfaces clean and sanitized', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-014', 14, 'Preparation', 'Approved food-grade utensils only; no wooden brushes/tools', 2),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FOOD'), 'CHK-FOO-015', 15, 'Documentation', 'Food safety checklist completed and corrective actions recorded', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-CHEM'), 'CHK-CHE-001', 1, 'Chemical Safety', 'Chemicals stored in designated cabinet', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-CHEM'), 'CHK-CHE-002', 2, 'Chemical Safety', 'Chemical cabinet clean, dry, rust-free, and dust-free', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-CHEM'), 'CHK-CHE-003', 3, 'Chemical Safety', 'Chemicals stored away from food and packaging', 2),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-CHEM'), 'CHK-CHE-004', 4, 'Chemical Safety', 'All chemical containers labeled and not expired', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-CHEM'), 'CHK-CHE-005', 5, 'Chemical Safety', 'SDS/MSDS available for chemicals in use', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-CHEM'), 'CHK-CHE-006', 6, 'Cross-Contamination', 'Raw and ready-to-eat foods separated', 2),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-CHEM'), 'CHK-CHE-007', 7, 'Cross-Contamination', 'Color-coded utensils/chopping boards used correctly', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-CHEM'), 'CHK-CHE-008', 8, 'Cross-Contamination', 'Food covered and protected from contamination', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-CHEM'), 'CHK-CHE-009', 9, 'Cross-Contamination', 'Food containers not overfilled or touching lids', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-CHEM'), 'CHK-CHE-010', 10, 'Cross-Contamination', 'Sanitizer concentration correct', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-CHEM'), 'CHK-CHE-011', 11, 'Cross-Contamination', 'Wiping cloths stored in sanitizer solution', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-CHEM'), 'CHK-CHE-012', 12, 'Personal Items', 'No mobile phones, personal drinks, medicines, or belongings in food areas', 2),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FIRE'), 'CHK-FIR-001', 1, 'Fire Protection', 'Fire alarm system operational', 2),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FIRE'), 'CHK-FIR-002', 2, 'Fire Protection', 'Fire extinguishers accessible and inspection date valid', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FIRE'), 'CHK-FIR-003', 3, 'Fire Protection', 'Fire blanket available and accessible', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FIRE'), 'CHK-FIR-004', 4, 'Fire Protection', 'Emergency lights and exit signs operational', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FIRE'), 'CHK-FIR-005', 5, 'Emergency Route', 'Emergency exits unobstructed', 2),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FIRE'), 'CHK-FIR-006', 6, 'Emergency Route', 'Evacuation paths clear; no storage in exit routes', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FIRE'), 'CHK-FIR-007', 7, 'Electrical', 'No exposed wires, damaged switches, or overloaded extensions', 2),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FIRE'), 'CHK-FIR-008', 8, 'Electrical', 'Electrical panels accessible and dry', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FIRE'), 'CHK-FIR-009', 9, 'Gas Safety', 'Gas cylinders secured and storage area safe', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FIRE'), 'CHK-FIR-010', 10, 'Gas Safety', 'Gas hoses/lines in good condition; shut-off valve accessible', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FIRE'), 'CHK-FIR-011', 11, 'Kitchen Fire Risk', 'Ovens and hot equipment free from excessive grease buildup', 2),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FIRE'), 'CHK-FIR-012', 12, 'Kitchen Fire Risk', 'Combustible materials kept away from heat sources', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-FIRE'), 'CHK-FIR-013', 13, 'Sharp Tools', 'Knives/sharp tools stored safely in designated holder', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-001', 1, 'Handwashing', 'Handwash sink operational with no leaks', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-002', 2, 'Handwashing', 'Hot water available', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-003', 3, 'Handwashing', 'Soap, sanitizer, and tissue available', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-004', 4, 'Handwashing', 'Handwashing poster displayed', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-005', 5, 'Personal Hygiene', 'Team members fit for work; no illness symptoms', 5),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-006', 6, 'Personal Hygiene', 'Hairnets/hats worn correctly and uniforms clean', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-007', 7, 'Personal Hygiene', 'No jewelry, watches, bracelets, or false nails at workstation', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-008', 8, 'Personal Hygiene', 'No eating or smoking in production areas', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-009', 9, 'Cleaning', 'Floors, walls, doors, and windows clean', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-010', 10, 'Cleaning', 'Ceilings, AC flaps, and lights clean with no gaps/dust', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-011', 11, 'Cleaning', 'Chillers, gaskets, and cold equipment clean and in good repair', 2),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-012', 12, 'Cleaning', 'Oven/hot equipment clean and free from grease/carbon buildup', 2),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-013', 13, 'Cleaning', 'Waste bins clean, not overloaded, and foot pedals working', 1),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-014', 14, 'Cleaning', 'Drains, grease trape clean and odor-free', 5),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-015', 15, 'Pest Prevention', 'No ants, flies, cockroaches, dead insects, or pest harbourage observed', 5),
  ((SELECT id FROM checklist_templates WHERE code = 'TPL-HYG'), 'CHK-HYG-016', 16, 'Pest Prevention', 'External perimeter clean and doors/air curtains functioning', 1)
ON CONFLICT (code) DO UPDATE SET
  template_id = EXCLUDED.template_id,
  sort_order  = EXCLUDED.sort_order,
  section     = EXCLUDED.section,
  question    = EXCLUDED.question,
  weight      = EXCLUDED.weight;

-- 3) Link each item to its test via check_checklist_items. Skip silently if
--    either the item or the test isn't present (so partial environments
--    don't break the migration).
INSERT INTO check_checklist_items (check_id, checklist_item_id)
SELECT ch.id, ci.id FROM (VALUES
  ('CHK-FOO-001', 'ISO22000-TEST-001-2'),
  ('CHK-FOO-002', 'ISO22000-TEST-001-2'),
  ('CHK-FOO-003', 'ISO22000-TEST-001-2'),
  ('CHK-FOO-004', 'ISO22000-TEST-001-2'),
  ('CHK-FOO-005', 'ISO22000-TEST-001-2'),
  ('CHK-FOO-006', 'ISO22000-TEST-002-2'),
  ('CHK-FOO-007', 'ISO22000-TEST-002-2'),
  ('CHK-FOO-008', 'ISO22000-TEST-001-2'),
  ('CHK-FOO-009', 'HACCP-TEST-003-2'),
  ('CHK-FOO-010', 'HACCP-TEST-003-2'),
  ('CHK-FOO-011', 'HACCP-TEST-003-1'),
  ('CHK-FOO-012', 'HACCP-TEST-003-2'),
  ('CHK-FOO-013', 'ISO22000-TEST-001-2'),
  ('CHK-FOO-014', 'ISO22000-TEST-001-2'),
  ('CHK-FOO-015', 'HACCP-TEST-005-3'),
  ('CHK-CHE-001', 'CS-TEST-002-2'),
  ('CHK-CHE-002', 'CS-TEST-002-2'),
  ('CHK-CHE-003', 'CS-TEST-002-2'),
  ('CHK-CHE-004', 'ISO22000-TEST-002-2'),
  ('CHK-CHE-005', 'CS-TEST-001-1'),
  ('CHK-CHE-006', 'CC-TEST-001-2'),
  ('CHK-CHE-007', 'ISO22000-TEST-001-2'),
  ('CHK-CHE-008', 'ISO22000-TEST-001-2'),
  ('CHK-CHE-009', 'CC-TEST-001-2'),
  ('CHK-CHE-010', 'CS-TEST-001-2'),
  ('CHK-CHE-011', 'CS-TEST-001-2'),
  ('CHK-CHE-012', 'CC-TEST-001-2'),
  ('CHK-FIR-001', 'FS-TEST-001-2'),
  ('CHK-FIR-002', 'FS-TEST-001-2'),
  ('CHK-FIR-003', 'FS-TEST-001-2'),
  ('CHK-FIR-004', 'FS-TEST-001-2'),
  ('CHK-FIR-005', 'EP-TEST-001-2'),
  ('CHK-FIR-006', 'EP-TEST-001-2'),
  ('CHK-FIR-007', 'OS-TEST-001-2'),
  ('CHK-FIR-008', 'OS-TEST-001-2'),
  ('CHK-FIR-009', 'FS-TEST-002-2'),
  ('CHK-FIR-010', 'FS-TEST-002-2'),
  ('CHK-FIR-011', 'OS-TEST-002-2'),
  ('CHK-FIR-012', 'OS-TEST-002-2'),
  ('CHK-FIR-013', 'OS-TEST-002-2'),
  ('CHK-HYG-001', 'ISO22000-TEST-001-2'),
  ('CHK-HYG-002', 'ISO22000-TEST-001-2'),
  ('CHK-HYG-003', 'ISO22000-TEST-001-2'),
  ('CHK-HYG-004', 'ISO22000-TEST-001-2'),
  ('CHK-HYG-005', 'ISO22000-TEST-003-2'),
  ('CHK-HYG-006', 'ISO22000-TEST-003-2'),
  ('CHK-HYG-007', 'ISO22000-TEST-003-2'),
  ('CHK-HYG-008', 'ISO22000-TEST-003-2'),
  ('CHK-HYG-009', 'ISO22000-TEST-001-2'),
  ('CHK-HYG-010', 'ISO22000-TEST-001-2'),
  ('CHK-HYG-011', 'ISO22000-TEST-001-2'),
  ('CHK-HYG-012', 'OS-TEST-002-2'),
  ('CHK-HYG-013', 'OS-TEST-001-2'),
  ('CHK-HYG-014', 'ISO22000-TEST-001-2'),
  ('CHK-HYG-015', 'ISO22000-TEST-001-2'),
  ('CHK-HYG-016', 'ISO22000-TEST-001-2')
) AS v(item_code, test_code)
JOIN checks          ch ON ch.code = v.test_code
JOIN checklist_items ci ON ci.code = v.item_code
ON CONFLICT DO NOTHING;

