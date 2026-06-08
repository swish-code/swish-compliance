"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { execute, queryAll, queryOne } from "@/lib/db";
import { createSop } from "@/features/sops/repository";

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
