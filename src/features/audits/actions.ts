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
  getAudit,
} from "./repository";
import { createCapa } from "../capa/repository";
import { notify } from "@/features/notifications/service";

const CreateSchema = z.object({
  template_id: z.coerce.number().int().positive(),
  brand_id: z.coerce.number().int().positive().optional().nullable(),
  department_id: z.coerce.number().int().positive().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  audit_date: z.string().optional().nullable(),
});

const ResponseSchema = z.object({
  audit_id: z.coerce.number().int().positive(),
  item_id: z.coerce.number().int().positive(),
  response: z.enum(["pass", "fail", "na"]).optional().nullable(),
  notes: z.string().optional().nullable(),
  evidence_url: z.string().optional().nullable(),
});

const SubmitSchema = z.object({
  id: z.coerce.number().int().positive(),
  summary: z.string().optional().nullable(),
  spawn_capa: z.string().optional(),
});

/**
 * Editing rules for audits:
 *   1. Only the auditor (creator) — or an admin — may edit the audit.
 *   2. Once the audit is closed, no further edits are allowed by anyone.
 */
type AuditGuardSubject = { auditor_id: number | null; status: string };
type AuditGuardActor = { id: number; role: string };

function assertCanEditAudit(audit: AuditGuardSubject, actor: AuditGuardActor): void {
  if (audit.status === "closed") {
    throw new Error("This audit is closed and can't be edited anymore.");
  }
  const isOwner = audit.auditor_id === actor.id;
  const isAdmin = actor.role === "admin";
  if (!isOwner && !isAdmin) {
    throw new Error(
      "Only the auditor who created this audit can edit it."
    );
  }
}

export async function createAuditAction(formData: FormData) {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateSchema.parse({
    ...raw,
    brand_id: raw.brand_id === "" ? null : raw.brand_id,
    department_id: raw.department_id === "" ? null : raw.department_id,
    location: raw.location === "" ? null : raw.location,
    audit_date: raw.audit_date === "" ? null : raw.audit_date,
  });
  const id = await createAudit({ ...parsed, auditor_id: user.id });
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'create', 'audit', $3, $4)`,
    [user.id, user.email, id, JSON.stringify({ template_id: parsed.template_id })]
  );
  revalidatePath("/audits");
  redirect(`/audits/${id}`);
}

export async function saveResponseAction(formData: FormData) {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ResponseSchema.parse({
    ...raw,
    response: raw.response === "" ? null : raw.response,
    notes: raw.notes === "" ? null : raw.notes,
    evidence_url: raw.evidence_url === "" ? null : raw.evidence_url,
  });

  // Enforce the edit rules before touching the responses table.
  const audit = await getAudit(parsed.audit_id);
  if (!audit) throw new Error("Audit not found.");
  assertCanEditAudit(audit, user);

  await upsertResponse({
    audit_id: parsed.audit_id,
    item_id: parsed.item_id,
    response: parsed.response ?? null,
    notes: parsed.notes ?? null,
    evidence_url: parsed.evidence_url ?? null,
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
    title: hasCritical
      ? `🚨 Audit "${audit.template_name}" submitted with ${criticalFailed} CRITICAL failure(s)`
      : `Audit "${audit.template_name}" submitted (score ${scorePct}%)`,
    body: `${audit.brand_name ?? "Brand —"} · ${audit.department_name ?? "Department —"} · ${audit.location ?? "Location —"}. ${failedItemIds.length} total fails.`,
    severity: hasCritical ? "critical" : scorePct < 70 ? "warning" : "info",
    entity: { type: "audit", id: parsed.id, href: `/audits/${parsed.id}` },
  });

  revalidatePath("/audits");
  revalidatePath(`/audits/${parsed.id}`);
  revalidatePath("/capa");
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
