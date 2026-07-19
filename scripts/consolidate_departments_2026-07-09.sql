BEGIN;

-- 1) Create the 9 new canonical departments (parents first: DEPT-PL before DEPT-MT reuse)
INSERT INTO departments (name, code, is_active, division_id) SELECT 'Auditing', 'DEPT-AUD', TRUE, (SELECT id FROM divisions WHERE code='DIV-BEX') WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code='DEPT-AUD');
INSERT INTO departments (name, code, is_active, division_id) SELECT 'GRC', 'DEPT-GRC', TRUE, (SELECT id FROM divisions WHERE code='DIV-BEX') WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code='DEPT-GRC');
INSERT INTO departments (name, code, is_active, division_id) SELECT 'Transportation & Accommodation', 'DEPT-TRA', TRUE, (SELECT id FROM divisions WHERE code='DIV-ADM') WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code='DEPT-TRA');
INSERT INTO departments (name, code, is_active, division_id) SELECT 'Accounting', 'DEPT-ACC', TRUE, (SELECT id FROM divisions WHERE code='DIV-FIN') WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code='DEPT-ACC');
INSERT INTO departments (name, code, is_active, division_id) SELECT 'Central Bakery Unit', 'DEPT-CPUB', TRUE, (SELECT id FROM divisions WHERE code='DIV-PROD') WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code='DEPT-CPUB');
INSERT INTO departments (name, code, is_active, division_id) SELECT 'Property & Leasing', 'DEPT-PL', TRUE, (SELECT id FROM divisions WHERE code='DIV-PL') WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code='DEPT-PL');
INSERT INTO departments (name, code, is_active, division_id) SELECT 'Brand Marketing', 'DEPT-BRM', TRUE, (SELECT id FROM divisions WHERE code='DIV-MKT') WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code='DEPT-BRM');
INSERT INTO departments (name, code, is_active, division_id) SELECT 'Growth Marketing', 'DEPT-GRM', TRUE, (SELECT id FROM divisions WHERE code='DIV-MKT') WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code='DEPT-GRM');
INSERT INTO departments (name, code, is_active, division_id) SELECT 'Fleet', 'DEPT-LOG', TRUE, (SELECT id FROM divisions WHERE code='DIV-LOG') WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code='DEPT-LOG');

-- 2) Merge duplicates into their canonical row, then delete the duplicate
-- 900 -> 899
UPDATE sops SET department_id=899 WHERE department_id=900;
UPDATE audits SET department_id=899 WHERE department_id=900;
UPDATE corrective_actions SET department_id=899 WHERE department_id=900;
UPDATE users SET department_id=899 WHERE department_id=900;
INSERT INTO user_departments(user_id,department_id) SELECT user_id,899 FROM user_departments WHERE department_id=900 ON CONFLICT DO NOTHING;
DELETE FROM user_departments WHERE department_id=900;
DELETE FROM departments WHERE id=900;
-- 944 -> 898
UPDATE sops SET department_id=898 WHERE department_id=944;
UPDATE audits SET department_id=898 WHERE department_id=944;
UPDATE corrective_actions SET department_id=898 WHERE department_id=944;
UPDATE users SET department_id=898 WHERE department_id=944;
INSERT INTO user_departments(user_id,department_id) SELECT user_id,898 FROM user_departments WHERE department_id=944 ON CONFLICT DO NOTHING;
DELETE FROM user_departments WHERE department_id=944;
DELETE FROM departments WHERE id=944;
-- 947 -> 902
UPDATE sops SET department_id=902 WHERE department_id=947;
UPDATE audits SET department_id=902 WHERE department_id=947;
UPDATE corrective_actions SET department_id=902 WHERE department_id=947;
UPDATE users SET department_id=902 WHERE department_id=947;
INSERT INTO user_departments(user_id,department_id) SELECT user_id,902 FROM user_departments WHERE department_id=947 ON CONFLICT DO NOTHING;
DELETE FROM user_departments WHERE department_id=947;
DELETE FROM departments WHERE id=947;
-- 6 -> 903
UPDATE sops SET department_id=903 WHERE department_id=6;
UPDATE audits SET department_id=903 WHERE department_id=6;
UPDATE corrective_actions SET department_id=903 WHERE department_id=6;
UPDATE users SET department_id=903 WHERE department_id=6;
INSERT INTO user_departments(user_id,department_id) SELECT user_id,903 FROM user_departments WHERE department_id=6 ON CONFLICT DO NOTHING;
DELETE FROM user_departments WHERE department_id=6;
DELETE FROM departments WHERE id=6;
-- 8 -> 904
UPDATE sops SET department_id=904 WHERE department_id=8;
UPDATE audits SET department_id=904 WHERE department_id=8;
UPDATE corrective_actions SET department_id=904 WHERE department_id=8;
UPDATE users SET department_id=904 WHERE department_id=8;
INSERT INTO user_departments(user_id,department_id) SELECT user_id,904 FROM user_departments WHERE department_id=8 ON CONFLICT DO NOTHING;
DELETE FROM user_departments WHERE department_id=8;
DELETE FROM departments WHERE id=8;
-- 943 -> 1021
UPDATE sops SET department_id=1021 WHERE department_id=943;
UPDATE audits SET department_id=1021 WHERE department_id=943;
UPDATE corrective_actions SET department_id=1021 WHERE department_id=943;
UPDATE users SET department_id=1021 WHERE department_id=943;
INSERT INTO user_departments(user_id,department_id) SELECT user_id,1021 FROM user_departments WHERE department_id=943 ON CONFLICT DO NOTHING;
DELETE FROM user_departments WHERE department_id=943;
DELETE FROM departments WHERE id=943;
-- 946 -> 906
UPDATE sops SET department_id=906 WHERE department_id=946;
UPDATE audits SET department_id=906 WHERE department_id=946;
UPDATE corrective_actions SET department_id=906 WHERE department_id=946;
UPDATE users SET department_id=906 WHERE department_id=946;
INSERT INTO user_departments(user_id,department_id) SELECT user_id,906 FROM user_departments WHERE department_id=946 ON CONFLICT DO NOTHING;
DELETE FROM user_departments WHERE department_id=946;
DELETE FROM departments WHERE id=946;
-- 948 -> 907
UPDATE sops SET department_id=907 WHERE department_id=948;
UPDATE audits SET department_id=907 WHERE department_id=948;
UPDATE corrective_actions SET department_id=907 WHERE department_id=948;
UPDATE users SET department_id=907 WHERE department_id=948;
INSERT INTO user_departments(user_id,department_id) SELECT user_id,907 FROM user_departments WHERE department_id=948 ON CONFLICT DO NOTHING;
DELETE FROM user_departments WHERE department_id=948;
DELETE FROM departments WHERE id=948;
-- 5 -> 908
UPDATE sops SET department_id=908 WHERE department_id=5;
UPDATE audits SET department_id=908 WHERE department_id=5;
UPDATE corrective_actions SET department_id=908 WHERE department_id=5;
UPDATE users SET department_id=908 WHERE department_id=5;
INSERT INTO user_departments(user_id,department_id) SELECT user_id,908 FROM user_departments WHERE department_id=5 ON CONFLICT DO NOTHING;
DELETE FROM user_departments WHERE department_id=5;
DELETE FROM departments WHERE id=5;
-- 945 -> 910
UPDATE sops SET department_id=910 WHERE department_id=945;
UPDATE audits SET department_id=910 WHERE department_id=945;
UPDATE corrective_actions SET department_id=910 WHERE department_id=945;
UPDATE users SET department_id=910 WHERE department_id=945;
INSERT INTO user_departments(user_id,department_id) SELECT user_id,910 FROM user_departments WHERE department_id=945 ON CONFLICT DO NOTHING;
DELETE FROM user_departments WHERE department_id=945;
DELETE FROM departments WHERE id=945;

-- 3) Assign code/division/parent/name to the 14 reused canonical rows
UPDATE departments SET name='Admin & Government Formalities', code='DEPT-ADM', division_id=(SELECT id FROM divisions WHERE code='DIV-ADM'), parent_department_id=NULL WHERE id=897;
UPDATE departments SET name='Central Production Unit', code='DEPT-CPU', division_id=(SELECT id FROM divisions WHERE code='DIV-PROD'), parent_department_id=NULL WHERE id=898;
UPDATE departments SET name='Cost Control', code='DEPT-CC-FIN', division_id=(SELECT id FROM divisions WHERE code='DIV-FIN'), parent_department_id=NULL WHERE id=899;
UPDATE departments SET name='Customer Care', code='DEPT-CC', division_id=(SELECT id FROM divisions WHERE code='DIV-CX'), parent_department_id=NULL WHERE id=902;
UPDATE departments SET name='Complaints Operations', code='DEPT-CCOP', division_id=(SELECT id FROM divisions WHERE code='DIV-CX'), parent_department_id=(SELECT id FROM departments WHERE code='DEPT-CC') WHERE id=901;
UPDATE departments SET name='Human Resources', code='DEPT-HR', division_id=(SELECT id FROM divisions WHERE code='DIV-HR'), parent_department_id=NULL WHERE id=903;
UPDATE departments SET name='Information Technology', code='DEPT-IT', division_id=(SELECT id FROM divisions WHERE code='DIV-IT'), parent_department_id=NULL WHERE id=904;
UPDATE departments SET name='Integrated Business Excellence', code='DEPT-IBE', division_id=(SELECT id FROM divisions WHERE code='DIV-BEX'), parent_department_id=NULL WHERE id=905;
UPDATE departments SET name='Operation Excellence', code='DEPT-OPEX', division_id=(SELECT id FROM divisions WHERE code='DIV-BEX'), parent_department_id=NULL WHERE id=907;
UPDATE departments SET name='Procurement', code='DEPT-PROC', division_id=(SELECT id FROM divisions WHERE code='DIV-SC'), parent_department_id=NULL WHERE id=908;
UPDATE departments SET name='Research & Development', code='DEPT-RD', division_id=(SELECT id FROM divisions WHERE code='DIV-RD'), parent_department_id=NULL WHERE id=909;
UPDATE departments SET name='Warehouse & Logistics', code='DEPT-WL', division_id=(SELECT id FROM divisions WHERE code='DIV-WL'), parent_department_id=NULL WHERE id=910;
UPDATE departments SET name='Learning & Development', code='DEPT-LD', division_id=(SELECT id FROM divisions WHERE code='DIV-BEX'), parent_department_id=NULL WHERE id=1021;
UPDATE departments SET name='Maintenance', code='DEPT-MT', division_id=(SELECT id FROM divisions WHERE code='DIV-PL'), parent_department_id=(SELECT id FROM departments WHERE code='DEPT-PL') WHERE id=906;

-- VERIFY (printed before rollback/commit)
SELECT dv.code AS div, d.code, d.name, (SELECT code FROM departments p WHERE p.id=d.parent_department_id) AS parent FROM departments d LEFT JOIN divisions dv ON dv.id=d.division_id WHERE d.code IS NOT NULL ORDER BY dv.sort_order, d.code;
SELECT id,name FROM departments WHERE code IS NULL ORDER BY name; -- leftover uncoded (5 ambiguous + any)
SELECT COUNT(*) AS total_departments FROM departments;
SELECT COUNT(*) AS sops_without_dept FROM sops WHERE department_id IS NULL;