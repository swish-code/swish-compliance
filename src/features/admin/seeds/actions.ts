"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { execute, queryAll, queryOne } from "@/lib/db";
import { createSop } from "@/features/sops/repository";

/* ────────────────────────────────────────────────────────────────── */
/*  ECS GRC Framework Bundle import                                   */
/*                                                                    */
/*  Loads public/seeds/ecs_grc.json (24 frameworks, 49 controls,      */
/*  147 tests) into the system. Idempotent: ON CONFLICT(code) DO      */
/*  NOTHING so re-running is safe and counts only NEW inserts.        */
/* ────────────────────────────────────────────────────────────────── */

type EcsBundle = {
  meta: {
    source: string;
    extracted_at: string;
    counts: { frameworks: number; controls: number; tests: number };
  };
  frameworks: Array<Record<string, string>>;
  controls: Array<Record<string, string>>;
  tests: Array<Record<string, string>>;
};

/** Pick the first non-empty value, trimmed; return null if all empty. */
function pick(row: Record<string, string>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim().length > 0) return String(v).trim();
  }
  return null;
}

/** Map the xlsx frequency strings to our check.frequency enum.
 *  When the cell lists multiple ("Daily / Weekly"), pick the FIRST -
 *  the more conservative (frequent) one. */
function mapFrequency(raw: string | null): string {
  if (!raw) return "monthly";
  const lower = raw.toLowerCase();
  if (lower.includes("daily")) return "daily";
  if (lower.includes("weekly")) return "weekly";
  if (lower.includes("monthly")) return "monthly";
  if (lower.includes("quarterly")) return "quarterly";
  if (lower.includes("annual") || lower.includes("yearly")) return "annual";
  if (lower.includes("on demand") || lower.includes("ad-hoc") || lower.includes("ad hoc"))
    return "on_demand";
  return "monthly";
}

export async function importEcsGrcBundleAction(): Promise<void> {
  const admin = await requireAdmin();

  // 1) Load the pre-extracted JSON shipped under public/seeds/.
  const jsonPath = path.join(process.cwd(), "public", "seeds", "ecs_grc.json");
  const raw = await fs.readFile(jsonPath, "utf-8");
  const bundle: EcsBundle = JSON.parse(raw);

  // 2) Insert frameworks. Build code -> id map for the control join.
  let fwInserted = 0;
  let fwSkipped = 0;
  const fwIdByCode = new Map<string, number>();

  for (const f of bundle.frameworks) {
    const code = pick(f, "Framework ID");
    const name = pick(f, "Framework / Standard", "Framework/Standard");
    if (!code || !name) {
      fwSkipped++;
      continue;
    }
    const description = pick(f, "Framework Definition");
    const category = pick(f, "Pillar / Area", "Pillar/Area");
    const isActive = (pick(f, "Status") ?? "").toLowerCase() !== "inactive";

    const row = await queryOne<{ id: number; inserted: boolean }>(
      `WITH ins AS (
         INSERT INTO frameworks (code, name, description, category, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO NOTHING
         RETURNING id
       )
       SELECT id, TRUE AS inserted FROM ins
       UNION ALL
       SELECT id, FALSE AS inserted FROM frameworks WHERE code = $1
       LIMIT 1`,
      [code, name, description, category, isActive]
    );
    if (!row) continue;
    fwIdByCode.set(code, row.id);
    if (row.inserted) fwInserted++;
    else fwSkipped++;
  }

  // 3) Insert controls.
  let ctrlInserted = 0;
  let ctrlSkipped = 0;
  const ctrlIdByCode = new Map<string, number>();

  for (const c of bundle.controls) {
    const code = pick(c, "Control ID");
    const name = pick(c, "Control Name");
    if (!code || !name) {
      ctrlSkipped++;
      continue;
    }
    const description = pick(c, "Control Definition") ?? pick(c, "Requirement / Checkpoint");
    const category = pick(c, "Pillar / Area", "Pillar/Area");
    const fwCode = pick(c, "Framework ID");
    const frameworkId = fwCode ? fwIdByCode.get(fwCode) ?? null : null;

    const row = await queryOne<{ id: number; inserted: boolean }>(
      `WITH ins AS (
         INSERT INTO controls (code, name, description, framework_id, category, health_status)
         VALUES ($1, $2, $3, $4, $5, 'unknown')
         ON CONFLICT (code) DO NOTHING
         RETURNING id
       )
       SELECT id, TRUE AS inserted FROM ins
       UNION ALL
       SELECT id, FALSE AS inserted FROM controls WHERE code = $1
       LIMIT 1`,
      [code, name, description, frameworkId, category]
    );
    if (!row) continue;
    ctrlIdByCode.set(code, row.id);
    if (row.inserted) ctrlInserted++;
    else ctrlSkipped++;
  }

  // 4) Insert tests (our "checks" table).
  let testInserted = 0;
  let testSkipped = 0;
  for (const t of bundle.tests) {
    const code = pick(t, "Test ID");
    const name = pick(t, "Test Name");
    if (!code || !name) {
      testSkipped++;
      continue;
    }
    const description = pick(t, "Test Definition") ?? pick(t, "Mandatory Action / How to Perform");
    const ctrlCode = pick(t, "Control ID");
    const controlId = ctrlCode ? ctrlIdByCode.get(ctrlCode) ?? null : null;
    const frequency = mapFrequency(pick(t, "Frequency"));

    const row = await queryOne<{ inserted: boolean }>(
      `WITH ins AS (
         INSERT INTO checks (code, name, description, control_id, frequency)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO NOTHING
         RETURNING id
       )
       SELECT TRUE AS inserted FROM ins
       UNION ALL
       SELECT FALSE AS inserted FROM checks WHERE code = $1
       LIMIT 1`,
      [code, name, description, controlId, frequency]
    );
    if (!row) {
      testSkipped++;
      continue;
    }
    if (row.inserted) testInserted++;
    else testSkipped++;
  }

  // 5) Audit trail entry summarizing the import.
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'import:ecs_grc_bundle', 'system', 0, $3)`,
    [
      admin.id,
      admin.email,
      JSON.stringify({
        source: bundle.meta.source,
        extracted_at: bundle.meta.extracted_at,
        frameworks_inserted: fwInserted,
        frameworks_skipped: fwSkipped,
        controls_inserted: ctrlInserted,
        controls_skipped: ctrlSkipped,
        tests_inserted: testInserted,
        tests_skipped: testSkipped,
      }),
    ]
  );

  // 6) Refresh the obvious surfaces.
  revalidatePath("/frameworks");
  revalidatePath("/controls");
  revalidatePath("/tests");
  revalidatePath("/reports");
}

/**
 * The 9 departments referenced by the SOPs Wave 1 & 2 Playbook (June 2026)
 * that aren't part of the original seed. Order matches the playbook's
 * table of contents.
 */
const PLAYBOOK_DEPARTMENTS = [
  "L&D",
  "CPU",
  "Warehouse",
  "Procurement",
  "Cost Control",
  "Maintenance",
  "Customer Care",
  "IT",
  "OPEX",
];

/**
 * Bulk-create the departments above. Uses ON CONFLICT DO NOTHING so the
 * action is idempotent — re-running it is safe and will simply skip the
 * departments that already exist.
 *
 * Returns silently to keep server-action behaviour; the page revalidates
 * itself so the user immediately sees the new rows.
 */
export async function seedPlaybookDepartmentsAction(): Promise<void> {
  const admin = await requireAdmin();

  // 1) Find which ones don't exist yet so we can audit only the creations.
  const existing = await queryAll<{ name: string }>(
    `SELECT name FROM departments`
  );
  const existingNames = new Set(existing.map((r) => r.name.toLowerCase()));

  const toCreate = PLAYBOOK_DEPARTMENTS.filter(
    (n) => !existingNames.has(n.toLowerCase())
  );

  if (toCreate.length === 0) {
    // Nothing to do — every department is already present.
    revalidatePath("/admin/departments");
    return;
  }

  // 2) Insert them in a single statement using UNNEST for speed and atomicity.
  await execute(
    `INSERT INTO departments (name)
     SELECT n FROM UNNEST($1::text[]) AS n
     ON CONFLICT (name) DO NOTHING`,
    [toCreate]
  );

  // 3) Audit each one. We re-query to grab the IDs assigned by Postgres.
  const created = await queryAll<{ id: number; name: string }>(
    `SELECT id, name FROM departments WHERE name = ANY($1::text[])`,
    [toCreate]
  );
  for (const row of created) {
    await execute(
      `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
       VALUES ($1, $2, 'department:create', 'department', $3, $4)`,
      [
        admin.id,
        admin.email,
        row.id,
        JSON.stringify({ name: row.name, source: "playbook_seed" }),
      ]
    );
  }

  revalidatePath("/admin/departments");
  revalidatePath("/sops");
}

/**
 * Read public/seeds/recruitment-sop.xlsx, convert to a base64 data URL,
 * and create a SOP draft pre-filled with the metadata from the source
 * Excel template. After running, the SOP appears in /sops as a Draft —
 * the workflow (Compliance → BE → CEO) then proceeds as normal.
 *
 * Re-running is safe: we check whether a SOP with the same code already
 * exists and bail out early to avoid duplicates.
 */
export async function importRecruitmentSopAction(): Promise<void> {
  const user = await requireAdmin();

  // 1) Guard against duplicates so a double-click doesn't create two rows.
  const SEED_CODE = "HRD-REC-01";
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM sops WHERE code = $1 LIMIT 1`,
    [SEED_CODE]
  );
  if (existing) {
    // Already there — just take the admin to the existing SOP.
    revalidatePath("/sops");
    redirect(`/sops/${existing.id}`);
  }

  // 2) Read the template xlsx from disk and inline it as a data URL.
  //    `process.cwd()` resolves to the project root at runtime.
  const filePath = path.join(process.cwd(), "public", "seeds", "recruitment-sop.xlsx");
  const buffer = await fs.readFile(filePath);
  const base64 = buffer.toString("base64");
  const mime =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const dataUrl = `data:${mime};base64,${base64}`;

  // 3) Look up the HR department if it exists; otherwise leave null.
  //    We try a few common spellings ("Human Resources", "HR", "People & Culture").
  const dept = await queryOne<{ id: number }>(
    `SELECT id FROM departments
     WHERE name ILIKE 'Human Resources' OR name ILIKE 'HR' OR name ILIKE 'People%'
     ORDER BY is_active DESC, id ASC
     LIMIT 1`
  );

  // 4) Insert the SOP with the metadata pulled straight from the template.
  const description =
    "Universal SOP for Recruitment, Selection and Onboarding within SWiSH Group. " +
    "Covers Workforce Planning, Sourcing, Screening, Interview & Selection, Offer " +
    "Management, Onboarding & Orientation, Probation, and the Employee Referral " +
    "Program. ISO-aligned and compliant with Kuwait labour regulations.";

  const sopId = await createSop({
    code: SEED_CODE,
    title: "Recruitment SOP",
    description,
    version: "1.0",
    attachment_data_url: dataUrl,
    attachment_name: "Recruitment_SOP_Universal_Template.xlsx",
    attachment_mime: mime,
    department_id: dept?.id ?? null,
    effective_date: "2026-06-01",
    review_date: "2026-12-01",
    created_by: user.id,
  });

  // 5) Log the import so it shows up in the activity feed.
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'create', 'sop', $3, $4)`,
    [
      user.id,
      user.email,
      sopId,
      JSON.stringify({
        source: "admin_import",
        template: "Recruitment_SOP_Universal_Template.xlsx",
      }),
    ]
  );

  revalidatePath("/sops");
  redirect(`/sops/${sopId}`);
}
