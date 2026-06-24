-- =========================================================================
-- Real names + definitions + owner + audit-frequency for the 18 IT/HR
-- frameworks. Pulled from the auditor's framework.xlsx, keyed by code,
-- so this is a pure UPDATE against rows seeded in migration 027.
--
-- Idempotent: re-running is a no-op once the values match. Codes that
-- don't exist (partial environments) are silently skipped.
-- =========================================================================

UPDATE frameworks AS f SET
  name            = v.name,
  description     = v.description,
  owner_label     = v.owner_label,
  audit_frequency = v.audit_frequency
FROM (VALUES
  ('IT-FW-001', 'Information Security', 'Controls for information access, data loss prevention, document retention, encryption keys, and security incident tracking.', 'IT Security / IT Manager', 'Quarterly'),
  ('IT-FW-002', 'Network Security', 'Controls for network access, DDoS readiness, network risk mitigation, traffic monitoring, and event correlation.', 'Network Team / IT Security', 'Monthly / Quarterly'),
  ('IT-FW-003', 'Cloud Security', 'Controls for cloud access, cloud assets, backups, cloud incidents, and security configuration baselines.', 'Cloud / Infrastructure Team', 'Monthly / Quarterly'),
  ('IT-FW-004', 'Application Security', 'Controls for application encryption, threat modeling, patching, secure coding, and mobile app security testing.', 'Application / Development Team', 'Per release / Monthly'),
  ('IT-FW-005', 'Problem Management', 'Controls for known errors, problem records, root cause analysis, major problem reporting, and ISMS escalation.', 'IT Service Management / IT Operations', 'Monthly'),
  ('IT-FW-006', 'Security Management', 'Controls for security policies including password, backup/recovery, compliance management, secure disposal, and information transfer.', 'IT Security / Compliance', 'Quarterly / Annual'),
  ('IT-FW-007', 'Incident Management', 'Controls for incident handling, major incident reporting, internal reporting, damage incident reporting, and post-incident review.', 'IT Security / Service Desk', 'Monthly / Per incident'),
  ('HR-FW-001', 'HR Audit Preparation', 'Defines the scope, objectives, schedule, roles, responsibilities and documentation required before an HR audit starts.', NULL, NULL),
  ('HR-FW-002', 'Compliance Audit', 'Verifies HR practices comply with employment laws, benefits requirements, and employee record confidentiality.', NULL, NULL),
  ('HR-FW-003', 'Recruitment and Hiring Audit', 'Ensures hiring practices are fair, unbiased, standardized and compliant.', NULL, NULL),
  ('HR-FW-004', 'Compensation and Benefits Audit', 'Assesses pay structure and benefits for fairness, competitiveness and compliance.', NULL, NULL),
  ('HR-FW-005', 'Performance Management Audit', 'Reviews effectiveness and consistency of performance management processes.', NULL, NULL),
  ('HR-FW-006', 'Employee Relations Audit', 'Evaluates conflict resolution, grievance processes and exit interview practices.', NULL, NULL),
  ('HR-FW-007', 'Training and Development Audit', 'Ensures onboarding, training and career development opportunities are structured and aligned to needs.', NULL, NULL),
  ('HR-FW-008', 'HR Policies and Procedures Audit', 'Reviews employee handbook and HR policies for clarity, currency, communication and legal compliance.', NULL, NULL),
  ('HR-FW-009', 'Health and Safety Audit', 'Evaluates health and safety standards, emergency procedures, drills and employee support resources.', NULL, NULL),
  ('HR-FW-010', 'Diversity, Equity, and Inclusion Audit', 'Assesses DEI policies, programs, training and alignment with company values.', NULL, NULL),
  ('HR-FW-011', 'Audit Reporting and Follow-Up', 'Ensures findings are reported, action items are prioritized, action plans are assigned and follow-up procedures are tracked.', NULL, NULL)
) AS v(code, name, description, owner_label, audit_frequency)
WHERE f.code = v.code;
