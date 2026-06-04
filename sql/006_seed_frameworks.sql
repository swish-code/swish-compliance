-- Seed standard frameworks for an F&B group operating in Kuwait.
INSERT INTO frameworks (code, name, description, category) VALUES
  ('ISO22000', 'ISO 22000 — Food Safety Management',
   'International standard for food safety management systems across the supply chain.',
   'Food Safety'),
  ('HACCP', 'HACCP — Hazard Analysis & Critical Control Points',
   'Systematic preventive approach to food safety from biological, chemical, and physical hazards.',
   'Food Safety'),
  ('PIC1976', 'Kuwait Municipality Food Hygiene Regulations',
   'Local food hygiene and handling regulations enforced by Kuwait Municipality.',
   'Legal'),
  ('CIVDEF', 'Kuwait Civil Defense — Fire & Life Safety',
   'Fire safety, emergency exits, sprinklers and alarms per Kuwait Civil Defense code.',
   'HSE'),
  ('OHS', 'Occupational Health & Safety',
   'Workplace safety programs covering injuries, training, PPE, and incident reporting.',
   'HSE'),
  ('CUSTSAT', 'Customer Experience & Service Quality',
   'Internal standards for guest interaction, complaint handling and service recovery.',
   'Quality')
ON CONFLICT (code) DO NOTHING;
