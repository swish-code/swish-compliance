// Imports the SOP_GRC_Department_Branch workbook into the compliance graph.
//
// Usage:
//   npm install xlsx --no-save        # not a runtime dep — install on demand
//   DATABASE_URL=... WORKBOOK=path/to.xlsx \
//     node scripts/import_sop_grc_workbook.mjs [--dry-run]
//
// Idempotent: every insert upserts on the row's natural `code`, so re-running
// against the same workbook is a no-op. --dry-run runs the whole thing inside
// a transaction and rolls back, printing the counts it would have written.

import pg from 'pg';
import XLSX from 'xlsx';

const { Client } = pg;

const WORKBOOK = process.env.WORKBOOK;
const DRY_RUN = process.argv.includes('--dry-run');
const IMPORT_USER_ID = Number(process.env.IMPORT_USER_ID ?? 1);

const wb = XLSX.readFile(WORKBOOK);
const sheet = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null });

const rows = {
  departments: sheet('Departments'),
  domains: sheet('Domains'),
  sops: sheet('SOPs'),
  frameworks: sheet('Frameworks'),
  controls: sheet('Controls'),
  tests: sheet('Tests & Evidences'),
  checklists: sheet('Checklists'),
  questions: sheet('Questions'),
};

const txt = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

// "15/01/2026" -> "2026-01-15"
const parseDate = (v) => {
  const s = txt(v);
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};

// The workbook's NEXT REVIEW DATE is prose. Derive a date only when it states a
// real interval; event-driven wording ("when the matrix is updated") has none.
const reviewDateFrom = (effectiveISO, label) => {
  if (!effectiveISO || !label) return null;
  const l = label.toLowerCase();
  let months = null;
  const every = l.match(/every\s+(\d+)\s+month/);
  if (every) months = Number(every[1]);
  else if (/\bmonthly\b/.test(l)) months = 1;
  else if (/\bquarterly\b/.test(l)) months = 3;
  else if (/\bannual|yearly\b/.test(l)) months = 12;
  if (months === null) return null;
  const [y, m, d] = effectiveISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
};

const versionOf = (v) => {
  const s = txt(v);
  if (!s) return '1.0';
  const m = s.match(/^\s*(\d+(?:\.\d+)*)/);
  return m ? m[1] : s.slice(0, 20);
};

const joinLines = (...parts) => {
  const kept = parts.filter(Boolean);
  return kept.length ? kept.join('\n') : null;
};

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  const log = [];
  try {
    await client.query('BEGIN');

    // Departments are pre-existing reference data — resolve by name, never create.
    const deptByCode = new Map();
    for (const r of rows.departments) {
      const name = txt(r['DEPARTMENT NAME']);
      const res = await client.query('SELECT id FROM departments WHERE name = $1', [name]);
      if (!res.rows.length) throw new Error(`Department not found in system: "${name}"`);
      deptByCode.set(txt(r['DEPARTMENT ID']), res.rows[0].id);
    }
    log.push(`resolved departments: ${[...deptByCode.keys()].join(', ')}`);

    // SOPs must exist before domains/frameworks so their sop_id FKs can be
    // resolved, but domains are inserted first for sort_order stability.
    // Two passes: insert domains bare, then backfill sop_id after SOPs land.
    const domainIdByCode = new Map();
    for (const [i, r] of rows.domains.entries()) {
      const code = txt(r['DOMAIN ID']);
      const res = await client.query(
        `INSERT INTO domains (code, name, description, sort_order, is_active, department_id)
         VALUES ($1, $2, $3, $4, TRUE, $5)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name, description = EXCLUDED.description,
           sort_order = EXCLUDED.sort_order, is_active = TRUE,
           department_id = EXCLUDED.department_id
         RETURNING id`,
        [
          code, txt(r['DOMAIN NAME']), txt(r['DOMAIN DESCRIPTION']), i + 1,
          deptByCode.get(txt(r['DEPARTMENT ID'])) ?? null,
        ],
      );
      domainIdByCode.set(code, res.rows[0].id);
    }
    log.push(`domains: ${domainIdByCode.size}`);

    // SOPs ---------------------------------------------------------------
    const sopIdByCode = new Map();
    const sopReviewNotes = [];
    for (const r of rows.sops) {
      const code = txt(r.CODE);
      const effective = parseDate(r['EFFECTIVE DATE']);
      const reviewLabel = txt(r['NEXT REVIEW DATE']);
      const review = reviewDateFrom(effective, reviewLabel);
      if (reviewLabel && !review) sopReviewNotes.push(`${code}: "${reviewLabel}" (no interval — review_date left empty)`);

      let ownership = txt(r['OWNERSHIP & REVIEW']);
      if (reviewLabel && (!ownership || !ownership.toLowerCase().includes(reviewLabel.toLowerCase().slice(0, 25)))) {
        ownership = joinLines(ownership, `Review cycle: ${reviewLabel}`);
      }

      const res = await client.query(
        `INSERT INTO sops (
           code, title, description, version, status,
           brand_id, department_id, brand_is_function, is_all_departments,
           owner_id, created_by, approved_by, approved_at,
           effective_date, review_date,
           purpose, scope, process_flow, roles_responsibilities, inputs_outputs,
           tools_forms, kpis, ownership_review, appendices, signatures_approval
         ) VALUES (
           $1,$2,$3,$4,'approved',
           NULL,$5,TRUE,FALSE,
           $6,$6,$6,NOW(),
           $7,$8,
           $9,$10,$11,$12,$13,
           $14,$15,$16,$17,$18
         )
         ON CONFLICT (code) DO UPDATE SET
           title = EXCLUDED.title, description = EXCLUDED.description,
           version = EXCLUDED.version, status = EXCLUDED.status,
           department_id = EXCLUDED.department_id,
           brand_is_function = EXCLUDED.brand_is_function,
           effective_date = EXCLUDED.effective_date, review_date = EXCLUDED.review_date,
           purpose = EXCLUDED.purpose, scope = EXCLUDED.scope,
           process_flow = EXCLUDED.process_flow,
           roles_responsibilities = EXCLUDED.roles_responsibilities,
           inputs_outputs = EXCLUDED.inputs_outputs, tools_forms = EXCLUDED.tools_forms,
           kpis = EXCLUDED.kpis, ownership_review = EXCLUDED.ownership_review,
           appendices = EXCLUDED.appendices, signatures_approval = EXCLUDED.signatures_approval
         RETURNING id`,
        [
          code, txt(r.TITLE), txt(r.DESCRIPTION), versionOf(r.VERSION),
          deptByCode.get(txt(r['DEPARTMENT ID'])),
          IMPORT_USER_ID,
          effective, review,
          txt(r.PURPOSE), txt(r.SCOPE), txt(r['PROCESS FLOW']),
          txt(r['ROLES & RESPONSIBILITIES']), txt(r['INPUTS & OUTPUTS']),
          txt(r['TOOLS & FORMS']), txt(r['KEY PERFORMANCE INDICATORS (KPIS)']),
          ownership, txt(r['APPENDICES - READY TO USE FORMS']),
          txt(r['SIGNATURES & APPROVAL']),
        ],
      );
      sopIdByCode.set(code, res.rows[0].id);
    }
    log.push(`sops: ${sopIdByCode.size} (status=approved, brand_is_function=TRUE)`);

    // Now that SOPs have ids, wire each domain to the SOP it governs.
    // This edge is what lets the audit scope picker walk SOP → domains.
    let domainSopLinks = 0;
    for (const r of rows.domains) {
      const sopId = sopIdByCode.get(txt(r['RELATED SOP CODE']));
      if (!sopId) continue;
      await client.query('UPDATE domains SET sop_id = $1 WHERE code = $2', [
        sopId, txt(r['DOMAIN ID']),
      ]);
      domainSopLinks += 1;
    }
    log.push(`domains linked to SOPs: ${domainSopLinks}`);

    // Frameworks ---------------------------------------------------------
    const fwIdByCode = new Map();
    for (const r of rows.frameworks) {
      const code = txt(r['FRAMEWORK ID']);
      const sopCode = txt(r['RELATED SOP CODE']);
      const res = await client.query(
        `INSERT INTO frameworks (code, name, description, category, domain_id, is_active,
                                 reference_source, sop_id, department_id)
         VALUES ($1,$2,$3,$4,$5,TRUE,$6,$7,$8)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name, description = EXCLUDED.description,
           category = EXCLUDED.category, domain_id = EXCLUDED.domain_id,
           is_active = TRUE, reference_source = EXCLUDED.reference_source,
           sop_id = EXCLUDED.sop_id, department_id = EXCLUDED.department_id
         RETURNING id`,
        [
          code, txt(r['FRAMEWORK NAME']), txt(r['FRAMEWORK DESCRIPTION']),
          txt(r['DOMAIN NAME']),
          domainIdByCode.get(txt(r['DOMAIN ID'])),
          sopCode ? `${sopCode} — ${txt(r['RELATED SOP TITLE'])}` : null,
          sopIdByCode.get(sopCode) ?? null,
          deptByCode.get(txt(r['DEPARTMENT ID'])) ?? null,
        ],
      );
      fwIdByCode.set(code, res.rows[0].id);
    }
    log.push(`frameworks: ${fwIdByCode.size}`);

    // Controls -----------------------------------------------------------
    const ctlIdByCode = new Map();
    for (const r of rows.controls) {
      const code = txt(r['CONTROL ID']);
      const risk = txt(r['RISK / ISSUE COVERED']);
      const description = joinLines(
        txt(r['CONTROL DESCRIPTION']),
        risk ? `Risk / issue covered: ${risk}` : null,
      );
      const res = await client.query(
        `INSERT INTO controls (code, name, description, framework_id, category, is_active,
                               health_status, requirement, clause_reference)
         VALUES ($1,$2,$3,$4,$5,TRUE,'unknown',$6,$7)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name, description = EXCLUDED.description,
           framework_id = EXCLUDED.framework_id, category = EXCLUDED.category,
           is_active = TRUE, requirement = EXCLUDED.requirement,
           clause_reference = EXCLUDED.clause_reference
         RETURNING id`,
        [
          code, txt(r['CONTROL NAME']), description,
          fwIdByCode.get(txt(r['FRAMEWORK ID'])),
          txt(r['CONTROL OWNER']),
          txt(r['CONTROL OBJECTIVE']),
          txt(r['RELATED PROCESS STEP']),
        ],
      );
      ctlIdByCode.set(code, res.rows[0].id);

      const sopId = sopIdByCode.get(txt(r['RELATED SOP CODE']));
      if (sopId) {
        await client.query(
          `INSERT INTO control_links (control_id, entity_type, entity_id, created_by)
           VALUES ($1,'sop',$2,$3) ON CONFLICT DO NOTHING`,
          [res.rows[0].id, sopId, IMPORT_USER_ID],
        );
      }
    }
    log.push(`controls: ${ctlIdByCode.size} (+ control_links to SOPs)`);

    // Checklist templates -------------------------------------------------
    const tplIdByCode = new Map();
    for (const r of rows.checklists) {
      const code = txt(r['CHECKLIST ID']);
      const res = await client.query(
        `INSERT INTO checklist_templates (code, name, description, category, is_active, created_by)
         VALUES ($1,$2,$3,$4,TRUE,$5)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name, description = EXCLUDED.description,
           category = EXCLUDED.category, is_active = TRUE
         RETURNING id`,
        [
          code, txt(r['CHECKLIST NAME']), txt(r['CHECKLIST DESCRIPTION']),
          txt(r['DOMAIN NAME']), IMPORT_USER_ID,
        ],
      );
      tplIdByCode.set(code, res.rows[0].id);
    }
    log.push(`checklist_templates: ${tplIdByCode.size}`);

    // Checklist items (Questions) -----------------------------------------
    const itemIdByCode = new Map();
    const sortByTemplate = new Map();
    for (const r of rows.questions) {
      const code = txt(r['QUESTION ID']);
      const tplCode = txt(r['CHECKLIST ID']);
      const templateId = tplIdByCode.get(tplCode);
      if (!templateId) throw new Error(`Question ${code} references unknown checklist ${tplCode}`);
      const sort = (sortByTemplate.get(tplCode) ?? 0) + 1;
      sortByTemplate.set(tplCode, sort);

      const guidance = joinLines(
        txt(r['ANSWER TYPE']) ? `Answer type: ${txt(r['ANSWER TYPE'])}` : null,
        txt(r['EXPECTED ANSWER']) ? `Expected answer: ${txt(r['EXPECTED ANSWER'])}` : null,
        txt(r['EVIDENCE REQUIRED']) ? `Evidence required: ${txt(r['EVIDENCE REQUIRED'])}` : null,
        txt(r['FINDING TRIGGER']) ? `Finding trigger: ${txt(r['FINDING TRIGGER'])}` : null,
        txt(r['REVIEW NOTE']) ? `Note: ${txt(r['REVIEW NOTE'])}` : null,
      );

      const res = await client.query(
        `INSERT INTO checklist_items (template_id, code, sort_order, question, guidance, weight, is_critical, section)
         VALUES ($1,$2,$3,$4,$5,1,$6,$7)
         ON CONFLICT (code) DO UPDATE SET
           template_id = EXCLUDED.template_id, sort_order = EXCLUDED.sort_order,
           question = EXCLUDED.question, guidance = EXCLUDED.guidance,
           is_critical = EXCLUDED.is_critical, section = EXCLUDED.section
         RETURNING id`,
        [
          templateId, code, sort, txt(r.QUESTION), guidance,
          txt(r.MANDATORY)?.toLowerCase() === 'yes',
          txt(r.SECTION),
        ],
      );
      itemIdByCode.set(code, res.rows[0].id);
    }
    log.push(`checklist_items: ${itemIdByCode.size}`);

    // Tests (checks) -------------------------------------------------------
    const failTrigger = txt(rows.questions[0]?.['FINDING TRIGGER']);
    const checkIdByCode = new Map();
    for (const r of rows.tests) {
      const code = txt(r['TEST ID']);
      const tplCode = rows.checklists.find((c) => txt(c['TEST ID']) === code)?.['CHECKLIST ID'];
      const evidence = joinLines(
        txt(r['EVIDENCE NAME']) ? `${txt(r['EVIDENCE NAME'])}:` : null,
        txt(r['EVIDENCE DESCRIPTION']),
      );
      const res = await client.query(
        `INSERT INTO checks (code, name, control_id, frequency, is_active, checklist_template_id,
                             procedure_steps, frequency_label, evidence_code, evidence_needed,
                             performer_role, fail_criteria)
         VALUES ($1,$2,$3,'on_demand',TRUE,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name, control_id = EXCLUDED.control_id,
           checklist_template_id = EXCLUDED.checklist_template_id,
           procedure_steps = EXCLUDED.procedure_steps,
           frequency_label = EXCLUDED.frequency_label,
           evidence_code = EXCLUDED.evidence_code, evidence_needed = EXCLUDED.evidence_needed,
           performer_role = EXCLUDED.performer_role, fail_criteria = EXCLUDED.fail_criteria,
           is_active = TRUE
         RETURNING id`,
        [
          code, txt(r['TEST NAME']),
          ctlIdByCode.get(txt(r['CONTROL ID'])),
          tplIdByCode.get(txt(tplCode)) ?? null,
          txt(r['TEST PROCEDURE']),
          txt(r['TEST FREQUENCY']),
          txt(r['EVIDENCE ID']),
          evidence,
          txt(r['EVIDENCE OWNER']),
          failTrigger,
        ],
      );
      checkIdByCode.set(code, res.rows[0].id);

      const ctlId = ctlIdByCode.get(txt(r['CONTROL ID']));
      if (ctlId) {
        await client.query(
          `INSERT INTO control_links (control_id, entity_type, entity_id, created_by)
           VALUES ($1,'check',$2,$3) ON CONFLICT DO NOTHING`,
          [ctlId, res.rows[0].id, IMPORT_USER_ID],
        );
      }
    }
    log.push(`checks: ${checkIdByCode.size} (+ control_links to checks)`);

    // Test <-> checklist item links ---------------------------------------
    let links = 0;
    for (const r of rows.questions) {
      const checkId = checkIdByCode.get(txt(r['TEST ID']));
      const itemId = itemIdByCode.get(txt(r['QUESTION ID']));
      if (!checkId || !itemId) continue;
      await client.query(
        `INSERT INTO check_checklist_items (check_id, checklist_item_id)
         VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [checkId, itemId],
      );
      links += 1;
    }
    log.push(`check_checklist_items: ${links}`);

    if (DRY_RUN) {
      await client.query('ROLLBACK');
      log.push('DRY RUN — rolled back, nothing persisted.');
    } else {
      await client.query('COMMIT');
      log.push('COMMITTED.');
    }

    console.log(log.join('\n'));
    if (sopReviewNotes.length) {
      console.log('\nSOPs with prose review cycles (no computable date):');
      sopReviewNotes.forEach((n) => console.log('  - ' + n));
    }
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('FAILED, rolled back:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
