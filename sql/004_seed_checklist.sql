-- Optional starter checklist template so the Audits page isn't empty on day one.
INSERT INTO checklist_templates (code, name, description, category)
VALUES (
  'CL-FS-01',
  'Daily Food Safety Walkthrough',
  'Quick daily inspection covering critical food safety controls.',
  'Food Safety'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO checklist_items (template_id, sort_order, question, weight, is_critical)
SELECT t.id, v.sort_order, v.question, v.weight, v.is_critical
FROM checklist_templates t
CROSS JOIN (VALUES
  (1,  'All refrigerators between 1°C and 4°C',                     3, TRUE),
  (2,  'All freezers at -18°C or below',                            3, TRUE),
  (3,  'Hot-hold items above 63°C',                                 3, TRUE),
  (4,  'Handwash sinks stocked (soap, paper towels) and accessible', 2, FALSE),
  (5,  'Sanitizer station prepared at correct concentration',        2, FALSE),
  (6,  'Floors and drains clean, no visible pests',                  2, FALSE),
  (7,  'Date-marking present on all opened products',                3, TRUE),
  (8,  'Staff in clean uniform with hair restraint',                 1, FALSE),
  (9,  'Cleaning chemicals stored separately from food',             2, TRUE),
  (10, 'Fire exits unobstructed',                                    1, FALSE)
) AS v(sort_order, question, weight, is_critical)
WHERE t.code = 'CL-FS-01'
  AND NOT EXISTS (
    SELECT 1 FROM checklist_items i
    WHERE i.template_id = t.id AND i.sort_order = v.sort_order
  );
