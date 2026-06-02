-- Seed reference data (idempotent)

INSERT INTO brands (name) VALUES
  ('Verdi'),
  ('Ordable'),
  ('Mishmash'),
  ('Swish Catering')
ON CONFLICT (name) DO NOTHING;

INSERT INTO departments (name) VALUES
  ('Quality'),
  ('Operations'),
  ('Kitchen'),
  ('Front of House'),
  ('Procurement'),
  ('HR'),
  ('Finance'),
  ('IT')
ON CONFLICT (name) DO NOTHING;
