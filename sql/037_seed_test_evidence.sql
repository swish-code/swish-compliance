-- =========================================================================
-- Per-test evidence_code + evidence_needed from framework.xlsx.
--
-- A single test row in the spreadsheet repeats across multiple checklist-
-- question rows; the EVD code is identical across them but the
-- 'Evidence Required' text varies (matrix / sign-off / removal log / ...).
-- We collapse those variants into a bulleted list so the auditor sees
-- every artefact they need to collect.
-- =========================================================================

UPDATE checks SET
  evidence_code   = v.evidence_code,
  evidence_needed = v.evidence_needed
FROM (VALUES
  ('IT-INC-TEST-004-02', 'EVD-IT-0068', '- Action tracker
- Closure evidence'),
  ('TST-REC-002-02', 'EVD-HR-0020', '- Interview guide / evaluation forms'),
  ('IT-SEC-TEST-001-01', 'EVD-IT-0051', '- Admin settings / MFA evidence
- Exception approval
- Password policy'),
  ('TST-PREP-004-02', 'EVD-HR-0008', '- Document request list / secure data handling evidence'),
  ('TST-RPT-004-01', 'EVD-HR-0087', '- Follow-up tracker / CAPA evidence'),
  ('IT-INC-TEST-004-01', 'EVD-IT-0067', '- Damage incident report / asset list
- Structural damage incident report'),
  ('TST-ER-004-01', 'EVD-HR-0047', '- Grievance trend report / effectiveness review'),
  ('IT-INFO-TEST-004-01', 'EVD-IT-0007', '- Encryption key management sheet
- Key retirement evidence
- Key rotation log'),
  ('IT-NET-TEST-001-01', 'EVD-IT-0011', '- DDoS attack mitigation plan tracker
- DDoS plan'),
  ('IT-CLOUD-TEST-003-02', 'EVD-IT-0026', '- Recovery test evidence'),
  ('TST-TD-001-02', 'EVD-HR-0050', '- Onboarding checklist / orientation agenda'),
  ('TST-DEI-002-02', 'EVD-HR-0076', '- DEI training records / attendance'),
  ('TST-POL-003-02', 'EVD-HR-0062', '- Communication logs / acknowledgement records'),
  ('IT-INC-TEST-001-01', 'EVD-IT-0061', '- Incident guide
- Incident management guide
- Training/acknowledgment records'),
  ('TST-HS-002-02', 'EVD-HR-0068', '- Drill records / emergency procedure guide'),
  ('TST-HS-003-02', 'EVD-HR-0070', '- Mental health resources communication / EAP info'),
  ('IT-INFO-TEST-003-01', 'EVD-IT-0005', '- Disposal/destruction records
- Document retention tracker
- Exception approval
- Retention schedule'),
  ('TST-HS-004-02', 'EVD-HR-0072', '- Safety inspection reports / action logs'),
  ('IT-INFO-TEST-001-01', 'EVD-IT-0001', '- Access review sign-off
- Access rights matrix
- Access rights matrix / admin user list'),
  ('TST-ER-004-02', 'EVD-HR-0048', '- Grievance trend report / effectiveness review'),
  ('IT-APP-TEST-002-01', 'EVD-IT-0033', '- Threat model document
- Updated threat model'),
  ('IT-INFO-TEST-002-01', 'EVD-IT-0003', '- DLP incident investigation notes
- DLP incident log'),
  ('IT-CLOUD-TEST-004-02', 'EVD-IT-0028', '- Cloud incident log
- Cloud incident response log
- Incident response record
- Post-incident review'),
  ('TST-REC-002-01', 'EVD-HR-0019', '- Interview guide / evaluation forms'),
  ('IT-SEC-TEST-004-01', 'EVD-IT-0057', '- Disposal and destruction policy
- Disposal logs
- Vendor certificate/approval
- Wipe/destruction certificate'),
  ('TST-COMP-002-01', 'EVD-HR-0011', '- Benefits administration review / compliance sign-off'),
  ('IT-APP-TEST-002-02', 'EVD-IT-0034', '- Application threat model
- Risk acceptance/escalation'),
  ('TST-RPT-003-02', 'EVD-HR-0086', '- Action plan / timeline / owner tracker'),
  ('TST-PREP-001-01', 'EVD-HR-0001', '- Audit scope memo / objectives document'),
  ('TST-TD-004-01', 'EVD-HR-0055', '- Training matrix / progression records'),
  ('IT-PROB-TEST-003-01', 'EVD-IT-0045', '- Exception log
- Problem management process
- Problem tracker
- Sample problem records'),
  ('IT-PROB-TEST-001-02', 'EVD-IT-0042', '- Escalation record'),
  ('TST-ER-003-01', 'EVD-HR-0045', '- Exit interview questionnaire / completed forms'),
  ('TST-DEI-004-02', 'EVD-HR-0080', '- Survey results / DEI feedback report'),
  ('IT-PROB-TEST-002-01', 'EVD-IT-0043', '- Communication/escalation evidence
- Major problem report
- Major problem report template'),
  ('TST-CB-002-01', 'EVD-HR-0027', '- Salary review forms / approval records'),
  ('TST-DEI-004-01', 'EVD-HR-0079', '- Survey results / DEI feedback report'),
  ('TST-TD-002-02', 'EVD-HR-0052', '- Training needs analysis form / training plan'),
  ('TST-TD-003-02', 'EVD-HR-0054', '- Career path documentation / development plans'),
  ('IT-SEC-TEST-005-01', 'EVD-IT-0059', '- Exception/incident record
- Information transfer policy
- Transfer approvals
- Transfer logs/config evidence'),
  ('TST-PM-003-02', 'EVD-HR-0038', '- Goal setting documentation / evaluation criteria'),
  ('IT-PROB-TEST-001-01', 'EVD-IT-0041', '- KE record template
- Known error record
- Review evidence'),
  ('TST-HS-001-02', 'EVD-HR-0066', '- Safety inspection checklist / compliance report'),
  ('TST-COMP-004-01', 'EVD-HR-0015', '- Legal review schedule / policy review record'),
  ('IT-PROB-TEST-002-02', 'EVD-IT-0044', '- Post-review record'),
  ('TST-DEI-001-01', 'EVD-HR-0073', '- Anti-discrimination policy / case records / training evidence'),
  ('TST-PREP-001-02', 'EVD-HR-0002', '- Audit scope memo / objectives document'),
  ('IT-INFO-TEST-001-02', 'EVD-IT-0002', '- Access rights matrix
- User removal/change records'),
  ('TST-HS-001-01', 'EVD-HR-0065', '- Safety inspection checklist / compliance report'),
  ('TST-DEI-002-01', 'EVD-HR-0075', '- DEI training records / attendance'),
  ('IT-APP-TEST-004-01', 'EVD-IT-0037', '- Exception approval
- Secure coding checklist'),
  ('IT-PROB-TEST-005-02', 'EVD-IT-0050', '- Action tracker
- Escalation evidence'),
  ('IT-INFO-TEST-005-01', 'EVD-IT-0009', '- Incident tracker'),
  ('TST-REC-004-02', 'EVD-HR-0024', '- Standard question bank / interview evaluation form'),
  ('TST-CB-004-02', 'EVD-HR-0032', '- Market salary benchmark report'),
  ('TST-CB-003-02', 'EVD-HR-0030', '- Benefits communication template / acknowledgements'),
  ('TST-PREP-002-02', 'EVD-HR-0004', '- Audit calendar / stakeholder communication'),
  ('IT-PROB-TEST-005-01', 'EVD-IT-0049', '- ISMS policy
- Risk/problem review'),
  ('TST-POL-002-02', 'EVD-HR-0060', '- Policy review checklist / version control log'),
  ('IT-INC-TEST-005-02', 'EVD-IT-0070', '- Closure/post-review evidence
- Incident investigation record
- Internal incident report/tracker'),
  ('IT-APP-TEST-005-01', 'EVD-IT-0039', '- Release approval
- Testing tracker / vulnerability log'),
  ('TST-RPT-002-02', 'EVD-HR-0084', '- Action item register / prioritization matrix'),
  ('TST-POL-003-01', 'EVD-HR-0061', '- Communication logs / acknowledgement records'),
  ('IT-INC-TEST-003-01', 'EVD-IT-0065', '- Major incident report template'),
  ('TST-PM-004-01', 'EVD-HR-0039', '- Review schedule / reminders / completion tracker'),
  ('TST-COMP-001-01', 'EVD-HR-0009', '- Compliance checklist / legal review notes'),
  ('IT-NET-TEST-002-02', 'EVD-IT-0014', '- Network access control log
- Network access/control logs'),
  ('TST-PREP-003-01', 'EVD-HR-0005', '- RACI / audit assignment matrix'),
  ('IT-INC-TEST-003-02', 'EVD-IT-0066', '- Escalation/notification evidence
- Major incident report
- Post-incident review'),
  ('TST-ER-003-02', 'EVD-HR-0046', '- Exit interview questionnaire / completed forms'),
  ('TST-ER-002-02', 'EVD-HR-0044', '- Conflict resolution records / resource list'),
  ('IT-SEC-TEST-003-01', 'EVD-IT-0055', '- Compliance management policy/tracker
- Gap/action tracker'),
  ('TST-CB-001-01', 'EVD-HR-0025', '- Pay equity review / compensation audit'),
  ('TST-REC-004-01', 'EVD-HR-0023', '- Standard question bank / interview evaluation form'),
  ('IT-SEC-TEST-002-01', 'EVD-IT-0053', '- Backup and recovery policy
- Backup policy
- Recovery test records'),
  ('IT-INFO-TEST-005-02', 'EVD-IT-0010', '- Escalation record
- Incident closure evidence
- Incident reporting and tracking sheet'),
  ('IT-INC-TEST-001-02', 'EVD-IT-0062', '- Incident records'),
  ('TST-TD-004-02', 'EVD-HR-0056', '- Training matrix / progression records'),
  ('IT-SEC-TEST-002-02', 'EVD-IT-0054', '- Backup failure ticket'),
  ('IT-APP-TEST-004-02', 'EVD-IT-0038', '- Checklist sign-off
- Security scan/fix evidence'),
  ('IT-NET-TEST-001-02', 'EVD-IT-0012', '- Action tracker
- Test/review evidence'),
  ('TST-HS-003-01', 'EVD-HR-0069', '- Mental health resources communication / EAP info'),
  ('TST-PM-004-02', 'EVD-HR-0040', '- Review schedule / reminders / completion tracker'),
  ('IT-NET-TEST-002-01', 'EVD-IT-0013', '- Access change ticket/approval
- Device/network access review'),
  ('TST-POL-004-01', 'EVD-HR-0063', '- Legal/compliance review sign-off'),
  ('TST-REC-003-02', 'EVD-HR-0022', '- Background check consent and vendor records'),
  ('TST-COMP-003-02', 'EVD-HR-0014', '- Employee file audit / confidentiality controls'),
  ('TST-TD-002-01', 'EVD-HR-0051', '- Training needs analysis form / training plan'),
  ('IT-APP-TEST-003-02', 'EVD-IT-0036', '- Patch completion evidence'),
  ('TST-RPT-002-01', 'EVD-HR-0083', '- Action item register / prioritization matrix'),
  ('IT-INFO-TEST-002-02', 'EVD-IT-0004', '- DLP incident closure evidence
- Escalation record'),
  ('IT-CLOUD-TEST-001-02', 'EVD-IT-0022', '- Cloud access change records'),
  ('IT-NET-TEST-004-02', 'EVD-IT-0018', '- Alert/ticket records'),
  ('TST-COMP-002-02', 'EVD-HR-0012', '- Benefits administration review / compliance sign-off'),
  ('IT-APP-TEST-001-02', 'EVD-IT-0032', '- Application data encryption checklist'),
  ('TST-RPT-004-02', 'EVD-HR-0088', '- Follow-up tracker / CAPA evidence'),
  ('IT-NET-TEST-004-01', 'EVD-IT-0017', '- Monitoring dashboard / alert review
- Monitoring exception log
- Network traffic monitoring dashboard'),
  ('TST-POL-001-01', 'EVD-HR-0057', '- Employee handbook review record'),
  ('IT-INC-TEST-002-01', 'EVD-IT-0063', '- Exception record
- Incident management policy
- Incident policy
- Incident policy/RACI'),
  ('TST-PM-002-01', 'EVD-HR-0035', '- Improvement plan form / follow-up records'),
  ('IT-APP-TEST-001-01', 'EVD-IT-0031', '- Encryption configuration evidence
- Exception approval
- TLS/configuration evidence'),
  ('TST-HS-004-01', 'EVD-HR-0071', '- Safety inspection reports / action logs'),
  ('TST-COMP-003-01', 'EVD-HR-0013', '- Employee file audit / confidentiality controls'),
  ('TST-CB-001-02', 'EVD-HR-0026', '- Pay equity review / compensation audit'),
  ('TST-PM-003-01', 'EVD-HR-0037', '- Goal setting documentation / evaluation criteria'),
  ('IT-APP-TEST-003-01', 'EVD-IT-0035', '- Patch and update tracker
- Patch exception record
- Patch tracker'),
  ('TST-DEI-003-01', 'EVD-HR-0077', '- DEI program assessment form / metrics'),
  ('TST-DEI-003-02', 'EVD-HR-0078', '- DEI program assessment form / metrics'),
  ('TST-TD-001-01', 'EVD-HR-0049', '- Onboarding checklist / orientation agenda'),
  ('TST-HS-002-01', 'EVD-HR-0067', '- Drill records / emergency procedure guide'),
  ('TST-PM-002-02', 'EVD-HR-0036', '- Improvement plan form / follow-up records'),
  ('IT-CLOUD-TEST-002-01', 'EVD-IT-0023', '- Change / asset records
- Cloud asset inventory
- Cloud asset inventory tracker
- Cloud asset review'),
  ('TST-CB-004-01', 'EVD-HR-0031', '- Market salary benchmark report'),
  ('TST-RPT-001-02', 'EVD-HR-0082', '- HR audit summary report'),
  ('TST-TD-003-01', 'EVD-HR-0053', '- Career path documentation / development plans'),
  ('TST-PREP-002-01', 'EVD-HR-0003', '- Audit calendar / stakeholder communication'),
  ('TST-REC-001-01', 'EVD-HR-0017', '- Job description review log / approved JD templates'),
  ('TST-ER-001-02', 'EVD-HR-0042', '- Grievance policy / grievance form / records'),
  ('TST-DEI-001-02', 'EVD-HR-0074', '- Anti-discrimination policy / case records / training evidence'),
  ('TST-RPT-003-01', 'EVD-HR-0085', '- Action plan / timeline / owner tracker'),
  ('TST-CB-002-02', 'EVD-HR-0028', '- Salary review forms / approval records'),
  ('TST-PREP-004-01', 'EVD-HR-0007', '- Document request list / secure data handling evidence'),
  ('IT-NET-TEST-005-02', 'EVD-IT-0020', '- Escalation/ticket evidence
- Investigation record'),
  ('IT-APP-TEST-005-02', 'EVD-IT-0040', '- Retest evidence
- Secure mobile app testing tracker'),
  ('TST-COMP-004-02', 'EVD-HR-0016', '- Legal review schedule / policy review record'),
  ('TST-POL-004-02', 'EVD-HR-0064', '- Legal/compliance review sign-off'),
  ('TST-REC-003-01', 'EVD-HR-0021', '- Background check consent and vendor records'),
  ('TST-PM-001-02', 'EVD-HR-0034', '- Performance review templates / completed reviews'),
  ('IT-CLOUD-TEST-003-01', 'EVD-IT-0025', '- Backup reports
- Cloud backup and recovery testing tracker
- Remediation tickets'),
  ('IT-CLOUD-TEST-005-02', 'EVD-IT-0030', '- Baseline review record
- Cloud security configuration baseline
- Configuration review evidence
- Exception/remediation log'),
  ('IT-CLOUD-TEST-001-01', 'EVD-IT-0021', '- Access request/approval
- Cloud access control matrix
- Privileged access review'),
  ('TST-CB-003-01', 'EVD-HR-0029', '- Benefits communication template / acknowledgements'),
  ('TST-PREP-003-02', 'EVD-HR-0006', '- RACI / audit assignment matrix'),
  ('IT-SEC-TEST-003-02', 'EVD-IT-0056', '- Compliance obligations tracker
- Compliance review evidence'),
  ('TST-RPT-001-01', 'EVD-HR-0081', '- HR audit summary report'),
  ('IT-PROB-TEST-004-02', 'EVD-IT-0048', '- Action tracker
- Closure evidence'),
  ('TST-REC-001-02', 'EVD-HR-0018', '- Job description review log / approved JD templates'),
  ('TST-ER-001-01', 'EVD-HR-0041', '- Grievance policy / grievance form / records'),
  ('TST-COMP-001-02', 'EVD-HR-0010', '- Compliance checklist / legal review notes'),
  ('IT-INC-TEST-005-01', 'EVD-IT-0069', '- Internal incident report'),
  ('TST-POL-002-01', 'EVD-HR-0059', '- Policy review checklist / version control log'),
  ('TST-PM-001-01', 'EVD-HR-0033', '- Performance review templates / completed reviews'),
  ('TST-POL-001-02', 'EVD-HR-0058', '- Employee handbook review record'),
  ('IT-NET-TEST-003-01', 'EVD-IT-0015', '- Network risk mitigation report
- Risk register/report'),
  ('IT-PROB-TEST-004-01', 'EVD-IT-0047', '- Problem record template
- RCA in problem record'),
  ('IT-SEC-TEST-001-02', 'EVD-IT-0052', '- System configuration screenshot'),
  ('IT-NET-TEST-003-02', 'EVD-IT-0016', '- Escalation evidence
- Risk action tracker'),
  ('TST-ER-002-01', 'EVD-HR-0043', '- Conflict resolution records / resource list'),
  ('IT-NET-TEST-005-01', 'EVD-IT-0019', '- Correlation tracker/SIEM evidence
- Security event correlation tracker')
) AS v(test_code, evidence_code, evidence_needed)
WHERE checks.code = v.test_code;
