"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import { importGrcWorkbook, type ImportResult } from "@/lib/grcImport/importWorkbook";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB — the workbook is ~150KB; this is generous headroom.

/**
 * Runs the SOP_GRC workbook importer against an uploaded file.
 *
 * Two-step by design: the form's "Preview only" checkbox is checked by
 * default, so the first submit always runs inside a transaction that gets
 * rolled back (dryRun: true) and just reports what WOULD happen. The
 * admin reviews the counts/warnings, then re-submits the same file with
 * the checkbox off to actually commit. There's no server-side draft
 * state between the two calls — the browser just resends the file.
 */
export async function importGrcWorkbookAction(formData: FormData): Promise<ImportResult> {
  const admin = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      dryRun: true,
      committed: false,
      log: [],
      warnings: [],
      error: "Pick a .xlsx file first.",
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      dryRun: true,
      committed: false,
      log: [],
      warnings: [],
      error: `File is too large (${Math.round(file.size / 1024 / 1024)}MB). Max is 10MB.`,
    };
  }

  const dryRun = formData.get("dry_run") !== "false";
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await importGrcWorkbook(buffer, {
    dryRun,
    importUserId: admin.id,
  });

  if (result.committed) {
    await execute(
      `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
       VALUES ($1, $2, 'grc_workbook:imported', 'sop', NULL, $3)`,
      [
        admin.id,
        admin.email,
        JSON.stringify({ file_name: file.name, log: result.log }),
      ]
    );

    // Every entity type this touches lives on its own list page; revalidate
    // them all so the admin sees the new data immediately without a hard
    // refresh.
    for (const path of [
      "/sops",
      "/domains",
      "/frameworks",
      "/controls",
      "/tests",
      "/checklists/templates",
      "/questions",
    ]) {
      revalidatePath(path);
    }
  }

  return result;
}
