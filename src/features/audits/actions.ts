"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guard";
import { execute, queryOne } from "@/lib/db";
import {
  createAudit,
  upsertResponse,
  submitAudit,
  closeAudit,
  cancelAudit,
  reopenAudit,
  getAudit,
  addAuditAttachment,
  deleteAuditAttachment,
} from "./repository";
import { createCapa } from "../capa/repository";
import { notify } from "@/features/notifications/service";
import { extractAttachment, extractAttachments } from "@/lib/attachments";

const CreateSchema = z.object({
  // template_id is now optional (migration 038). The audit's checklist
  // items come from the selected tests' linked items, not a pre-picked
  // template. Older audits with a template still work because the
  // detail page falls back to the template when no tests are linked.
  template_id: z.coerce.number().int().positive().optional().nullable(),
  brand_id: z.coerce.number().int().positive().optional().nullable(),
  department_id: z.coerce.number().int().positive().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  audit_date: z.string().optional().nullable(),
  policy_id: z.coerce.number().int().positive().optional().nullable(),
  // Audit scope — domain → framework → control → tests. All required by
  // the form; the schema mirrors that so the action throws if any are
  // missing instead of silently creating a half-scoped audit.
  domain_id: z.coerce.number().int().positive({
    message: "Domain is required.",
  }),
  framework_id: z.coerce.number().int().positive({
    message: "Framework is required.",
  }),
  control_id: z.coerce.number().int().positive({
    message: "Control is required.",
  }),
  test_ids: z
    .array(z.coerce.number().int().positive())
    .min(1, "Pick at least one test."),
  // Audit window + assignee — all optional. datetime-local inputs send
  // ISO-ish strings ("2026-06-22T09:00") that Postgres can cast directly.
  start_at: z.string().optional().nullable(),
  end_at: z.string().optional().nullable(),
  assigned_to: z.coerce.number().int().positive().optional().nullable(),
});

const ResponseSchema = z.object({
  audit_id: z.coerce.number().int().positive(),
  item_id: z.coerce.number().int().positive(),
  response: z.enum(["pass", "fail", "na"]).optional().nullable(),
  // Notes are now optional. The Test → Checklist quick-answer UI lets
  // the auditor click Yes/No/N/A and move on; they only have to type
  // a note when they actually want to capture context.
  notes: z.string().trim().optional().nullable(),
});

const SubmitSchema = z.object({
  id: z.coerce.number().int().positive(),
  summary: z.string().optional().nullable(),
  spawn_capa: z.string().optional(),
});

/**
 * Editing rules for audits:
 *   1. Only the auditor (creator), the current assignee, or an admin may
 *      edit the audit. Re-assigning the audit transfers edit rights —
 *      previous assignees lose access (matches what we told the user).
 *   2. Once the audit is closed, no further edits are allowed by anyone.
 */
type AuditGuardSubject = {
  auditor_id: number | null;
  assigned_to: number | null;
  status: string;
};
type AuditGuardActor = { id: number; role: string };

/**
 * Pick a human-readable title for an audit in notifications / logs.
 * template_name is NULL in the tests-first flow (no pre-picked template),
 * so a fallback chain stops the UI from rendering "Audit "null"".
 */
function auditTitle(audit: {
  id: number;
  template_name?: string | null;
  control_name?: string | null;
  framework_name?: string | null;
}): string {
  return (
    audit.template_name ||
    audit.control_name ||
    audit.framework_name ||
    `#${audit.id}`
  );
}

function assertCanEditAudit(audit: AuditGuardSubject, actor: AuditGuardActor): void {
  if (audit.status === "closed") {
    throw new Error("This audit is closed and can't be edited anymore.");
  }
  const isOwner = audit.auditor_id === actor.id;
  const isAssignee = audit.assigned_to === actor.id;
  const isAdmin = actor.role === "admin";
  if (!isOwner && !isAssignee && !isAdmin) {
    throw new Error(
      "Only the auditor who created this audit, the user it's assigned to, or an admin can edit it."
    );
  }
}

export async function createAuditAction(formData: FormData) {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());
  // test_ids comes through as repeated `<input name="test_ids">` entries,
  // one per checkbox. Object.fromEntries collapses repeats to the last
  // value, so we have to pull the array from FormData directly.
  const testIds = formData
    .getAll("test_ids")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);

  const blank = (v: FormDataEntryValue | undefined) =>
    v === "" || v === undefined ? null : v;
  const parsed = CreateSchema.parse({
    ...raw,
    template_id: blank(raw.template_id),
    brand_id: blank(raw.brand_id),
    department_id: blank(raw.department_id),
    location: blank(raw.location),
    audit_date: blank(raw.audit_date),
    policy_id: blank(raw.policy_id),
    start_at: blank(raw.start_at),
    end_at: blank(raw.end_at),
    assigned_to: blank(raw.assigned_to),
    test_ids: testIds,
  });

  const id = await createAudit({
    template_id: parsed.template_id ?? null,
    brand_id: parsed.brand_id,
    department_id: parsed.department_id,
    location: parsed.location,
    audit_date: parsed.audit_date,
    policy_id: parsed.policy_id,
    framework_id: parsed.framework_id,
    domain_id: parsed.domain_id,
    control_id: parsed.control_id,
    start_at: parsed.start_at,
    end_at: parsed.end_at,
    assigned_to: parsed.assigned_to,
    auditor_id: user.id,
  });

  // Populate the audit_tests junction. Bulk-insert via a single VALUES
  // list so we don't fire N round-trips on the happy path.
  const placeholders = parsed.test_ids
    .map((_, i) => `($1, $${i + 2})`)
    .join(", ");
  await execute(
    `INSERT INTO audit_tests (audit_id, check_id) VALUES ${placeholders}
     ON CONFLICT DO NOTHING`,
    [id, ...parsed.test_ids]
  );

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'create', 'audit', $3, $4)`,
    [
      user.id,
      user.email,
      id,
      JSON.stringify({
        template_id: parsed.template_id ?? null,
        policy_id: parsed.policy_id ?? null,
        domain_id: parsed.domain_id,
        framework_id: parsed.framework_id,
        control_id: parsed.control_id,
        test_count: parsed.test_ids.length,
        start_at: parsed.start_at ?? null,
        end_at: parsed.end_at ?? null,
        assigned_to: parsed.assigned_to ?? null,
      }),
    ]
  );

  // If the creator picked an assignee, ping them. notify() swallows its
  // own errors so a flaky notification can't take the audit insert down.
  if (parsed.assigned_to && parsed.assigned_to !== user.id) {
    const windowBits = [
      parsed.start_at ? `Starts ${new Date(parsed.start_at).toLocaleString()}` : null,
      parsed.end_at   ? `Ends ${new Date(parsed.end_at).toLocaleString()}`     : null,
    ].filter(Boolean);
    const windowLine = windowBits.length ? windowBits.join(" · ") + ". " : "";
    await notify({
      audience: { userIds: [parsed.assigned_to] },
      actor: { id: user.id, name: user.displayName, role: user.role },
      kind: "audit:assigned",
      title: `📋 You've been assigned a new audit`,
      body:
        `Assigned by ${user.displayName}. ` +
        windowLine +
        `Open the audit to start recording responses.`,
      severity: "info",
      entity: { type: "audit", id, href: `/audits/${id}` },
    });
  }

  revalidatePath("/audits");
  redirect(`/audits/${id}`);
}

/**
 * Upload one or more files (photos / PDFs / docs) at the audit level.
 * Reuses the per-item evidence gate: only the auditor or admin can
 * attach, and never on a closed audit.
 */
export async function addAuditAttachmentsAction(formData: FormData) {
  const user = await requireUser();
  const auditId = Number(formData.get("audit_id"));
  if (!Number.isFinite(auditId) || auditId <= 0) {
    throw new Error("Invalid audit id.");
  }
  const audit = await getAudit(auditId);
  if (!audit) throw new Error("Audit not found.");
  assertCanEditAudit(audit, user);

  const files = await extractAttachments(formData, "files");
  if (files.length === 0) {
    throw new Error("Pick at least one file to upload.");
  }
  for (const f of files) {
    await addAuditAttachment({
      audit_id: auditId,
      file_url: f.dataUrl,
      file_name: f.name,
      file_mime: f.mime,
      file_size: f.size,
      uploaded_by: user.id,
    });
  }
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'audit:attachment_added', 'audit', $3, $4)`,
    [
      user.id,
      user.email,
      auditId,
      JSON.stringify({ count: files.length, names: files.map((f) => f.name) }),
    ]
  );
  revalidatePath(`/audits/${auditId}`);
}

/**
 * Remove one attachment. Same edit gate as the upload — auditor / admin,
 * not closed.
 */
export async function deleteAuditAttachmentAction(formData: FormData) {
  const user = await requireUser();
  const attachmentId = Number(formData.get("attachment_id"));
  const auditId = Number(formData.get("audit_id"));
  if (!Number.isFinite(attachmentId) || attachmentId <= 0) {
    throw new Error("Invalid attachment id.");
  }
  const audit = await getAudit(auditId);
  if (!audit) throw new Error("Audit not found.");
  assertCanEditAudit(audit, user);

  await deleteAuditAttachment(attachmentId);
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'audit:attachment_removed', 'audit', $3, $4)`,
    [user.id, user.email, auditId, JSON.stringify({ attachment_id: attachmentId })]
  );
  revalidatePath(`/audits/${auditId}`);
}

export async function saveResponseAction(formData: FormData) {
  const user = await requireUser();

  // 1) Pull the File entry out BEFORE Zod parsing (Zod treats files as strings).
  const file = await extractAttachment(formData, "evidence_file");

  // 2) Look at all the other form fields.
  const raw = Object.fromEntries(formData.entries());
  delete (raw as Record<string, unknown>).evidence_file;

  // The client sets update_evidence = "true" only when there's actually a
  // new file in the input. Otherwise we keep whatever evidence is on file.
  const updateEvidence = raw.update_evidence === "true";
  delete (raw as Record<string, unknown>).update_evidence;
  const explicitRemove = raw.remove_evidence === "true";
  delete (raw as Record<string, unknown>).remove_evidence;

  const parsed = ResponseSchema.parse({
    ...raw,
    response: raw.response === "" ? null : raw.response,
  });

  // 3) Enforce the edit rules before touching the responses table.
  const audit = await getAudit(parsed.audit_id);
  if (!audit) throw new Error("Audit not found.");
  assertCanEditAudit(audit, user);

  await upsertResponse({
    audit_id: parsed.audit_id,
    item_id: parsed.item_id,
    response: parsed.response ?? null,
    notes: parsed.notes ?? null,
    // Only touch the evidence columns when the client says it has something
    // new to write (file uploaded OR explicit removal). Plain Pass / notes
    // re-saves leave existing evidence untouched.
    evidence_url: file?.dataUrl ?? null,
    evidence_name: file?.name ?? null,
    evidence_mime: file?.mime ?? null,
    update_evidence: updateEvidence || explicitRemove,
  });
  revalidatePath(`/audits/${parsed.audit_id}`);
}

export async function submitAuditAction(formData: FormData) {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());
  const parsed = SubmitSchema.parse({ ...raw });
  const audit = await getAudit(parsed.id);
  if (!audit) throw new Error("Audit not found.");
  // Editing rules: owner / admin only, and not closed.
  assertCanEditAudit(audit, user);
  if (audit.status !== "in_progress") throw new Error("Audit is no longer in progress.");

  const { scorePct, criticalFailed, failedItemIds } = await submitAudit(
    parsed.id,
    parsed.summary ?? null
  );

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'audit:submitted', 'audit', $3, $4)`,
    [
      user.id,
      user.email,
      parsed.id,
      JSON.stringify({ score: scorePct, critical_failed: criticalFailed }),
    ]
  );

  // Auto-spawn CAPAs for failed items if requested
  if (parsed.spawn_capa === "on" && failedItemIds.length > 0) {
    for (const itemId of failedItemIds) {
      const item = await queryOne<{ question: string; is_critical: boolean }>(
        `SELECT question, is_critical FROM checklist_items WHERE id = $1`,
        [itemId]
      );
      if (!item) continue;
      await createCapa({
        title: `Audit finding: ${item.question}`,
        description: `Auto-generated from audit #${parsed.id}.`,
        severity: item.is_critical ? "critical" : "medium",
        source_audit_id: parsed.id,
        source_item_id: itemId,
        brand_id: audit.brand_id,
        department_id: audit.department_id,
        created_by: user.id,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
    }
  }

  // Notify reviewers. Critical fails go to a wider audience.
  const hasCritical = criticalFailed > 0;
  await notify({
    audience: hasCritical
      ? { roles: ["compliance", "business_excellence", "ceo", "admin"] }
      : { roles: ["compliance", "admin"] },
    actor: { id: user.id, name: user.displayName, role: user.role },
    kind: hasCritical ? "audit:critical" : "audit:submitted",
    // template_name is NULL for the tests-first flow. Fall back to the
    // control name, then the audit id, so titles never read "null".
    title: hasCritical
      ? `🚨 Audit "${auditTitle(audit)}" submitted with ${criticalFailed} CRITICAL failure(s)`
      : `Audit "${auditTitle(audit)}" submitted (score ${scorePct}%)`,
    body: `${audit.brand_name ?? "Brand —"} · ${audit.department_name ?? "Department —"} · ${audit.location ?? "Location —"}. ${failedItemIds.length} total fails.`,
    severity: hasCritical ? "critical" : scorePct < 70 ? "warning" : "info",
    entity: { type: "audit", id: parsed.id, href: `/audits/${parsed.id}` },
  });

  revalidatePath("/audits");
  revalidatePath(`/audits/${parsed.id}`);
  revalidatePath("/capa");
}

/**
 * Reopen a submitted audit so the auditor can edit responses again.
 * Allowed for the auditor (owner) or admin, and ONLY when the audit is
 * currently 'submitted'. Closed audits stay closed.
 */
export async function reopenAuditAction(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid audit id.");

  const audit = await getAudit(id);
  if (!audit) throw new Error("Audit not found.");
  // The standard edit gate already blocks 'closed' and non-owners.
  assertCanEditAudit(audit, user);
  if (audit.status !== "submitted") {
    throw new Error("Only a submitted audit can be reopened.");
  }

  await reopenAudit(id);
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id)
     VALUES ($1, $2, 'audit:reopened', 'audit', $3)`,
    [user.id, user.email, id]
  );

  // Let compliance know the audit is being edited again — useful for the
  // audit trail and so anyone watching the result knows the score is stale.
  await notify({
    audience: { roles: ["compliance", "admin"] },
    actor: { id: user.id, name: user.displayName, role: user.role },
    kind: "audit:reopened",
    title: `Audit "${auditTitle(audit)}" reopened for editing`,
    body: `${audit.brand_name ?? "Brand —"} · ${audit.department_name ?? "Department —"}. Previous score (${audit.score ?? "—"}%) cleared; will be recomputed on resubmit.`,
    severity: "info",
    entity: { type: "audit", id, href: `/audits/${id}` },
  });

  revalidatePath("/audits");
  revalidatePath(`/audits/${id}`);
}

/**
 * Cancel an assigned audit. The creator, an admin, compliance, or BE
 * can call this off — typically because the assignment was wrong or no
 * longer needed. We block cancel after submission so a completed audit
 * with a score can't be erased; closed audits also stay closed.
 *
 * Notifies the previous assignee so they know the work has been
 * called off.
 */
export async function cancelAuditAction(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid audit id.");

  const audit = await getAudit(id);
  if (!audit) throw new Error("Audit not found.");

  if (audit.status === "closed" || audit.status === "submitted") {
    throw new Error(
      "This audit has already been submitted or closed — it can no longer be cancelled."
    );
  }
  if (audit.status === "cancelled") {
    throw new Error("This audit is already cancelled.");
  }

  const isCreator = audit.auditor_id === user.id;
  const isAllowed =
    isCreator ||
    user.role === "admin" ||
    user.role === "compliance" ||
    user.role === "business_excellence";
  if (!isAllowed) {
    throw new Error(
      "Only the audit creator, compliance, business excellence, or admin can cancel an audit."
    );
  }

  await cancelAudit(id);
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'audit:cancelled', 'audit', $3, $4)`,
    [
      user.id,
      user.email,
      id,
      JSON.stringify({
        by_user_name: user.displayName,
        prev_assigned_to: audit.assigned_to,
      }),
    ]
  );

  if (audit.assigned_to && audit.assigned_to !== user.id) {
    await notify({
      audience: { userIds: [audit.assigned_to] },
      actor: { id: user.id, name: user.displayName, role: user.role },
      kind: "audit:cancelled",
      title: `Audit "${auditTitle(audit)}" was cancelled`,
      body: `${user.displayName} cancelled this audit. You no longer need to act on it.`,
      severity: "warning",
      entity: { type: "audit", id, href: `/audits/${id}` },
    });
  }

  revalidatePath("/audits");
  revalidatePath(`/audits/${id}`);
}

export async function closeAuditAction(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));

  const audit = await getAudit(id);
  if (!audit) throw new Error("Audit not found.");
  // The same edit gate guards close: only the auditor/admin can close, and
  // a closed audit can't be 'closed' again (assertCanEditAudit throws on
  // closed).
  assertCanEditAudit(audit, user);
  if (audit.status !== "submitted") {
    throw new Error("Only a submitted audit can be closed.");
  }

  await closeAudit(id);
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id)
     VALUES ($1, $2, 'audit:closed', 'audit', $3)`,
    [user.id, user.email, id]
  );
  revalidatePath("/audits");
  revalidatePath(`/audits/${id}`);
}
