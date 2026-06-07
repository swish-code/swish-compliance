"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, canEditSops } from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import { createCheck, recordResult, getCheck } from "./repository";
import { recomputeControlHealth } from "../controls/repository";
import { createCapa } from "../capa/repository";
import { notify } from "@/features/notifications/service";
import { extractAttachment } from "@/lib/attachments";

const CreateSchema = z.object({
  code: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  control_id: z.coerce.number().int().positive().optional().nullable(),
  owner_user_id: z.coerce.number().int().positive().optional().nullable(),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annual", "on_demand"]),
});

const ResultSchema = z.object({
  check_id: z.coerce.number().int().positive(),
  status: z.enum(["passing", "failing", "pending_review", "accepted_risk"]),
  notes: z.string().trim().min(1, "Notes are required when recording a result."),
  spawn_capa: z.string().optional(),
});

function nullEmpty<T extends Record<string, FormDataEntryValue>>(o: T) {
  const out: Record<string, unknown> = { ...o };
  for (const k of Object.keys(out)) if (out[k] === "") out[k] = null;
  return out;
}

export async function createCheckAction(formData: FormData) {
  const user = await requireUser();
  if (!canEditSops(user.role)) throw new Error("Not authorized.");
  const parsed = CreateSchema.parse(nullEmpty(Object.fromEntries(formData.entries())));
  const id = await createCheck(parsed);
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'create', 'check', $3, $4)`,
    [user.id, user.email, id, JSON.stringify({ name: parsed.name })]
  );
  if (parsed.control_id) {
    await execute(
      `INSERT INTO control_links (control_id, entity_type, entity_id, created_by)
       VALUES ($1, 'check', $2, $3) ON CONFLICT DO NOTHING`,
      [parsed.control_id, id, user.id]
    );
  }
  revalidatePath("/tests");
  redirect(`/tests/${id}`);
}

export async function recordResultAction(formData: FormData) {
  const user = await requireUser();

  // Pull the File entry out BEFORE Zod parsing — Zod treats it as a string.
  const file = await extractAttachment(formData, "evidence_file");

  const raw = Object.fromEntries(formData.entries());
  delete (raw as Record<string, unknown>).evidence_file;

  const parsed = ResultSchema.parse(raw);

  await recordResult({
    check_id: parsed.check_id,
    status: parsed.status,
    notes: parsed.notes,
    evidence_url: file?.dataUrl ?? null,
    evidence_name: file?.name ?? null,
    evidence_mime: file?.mime ?? null,
    performed_by: user.id,
  });

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, $3, 'check', $4, $5)`,
    [
      user.id,
      user.email,
      `check_result:${parsed.status}`,
      parsed.check_id,
      JSON.stringify({ status: parsed.status }),
    ]
  );

  // Recompute the linked control's health, and optionally spawn a CAPA on failure
  const check = await getCheck(parsed.check_id);
  if (check?.control_id) {
    await recomputeControlHealth(check.control_id);
  }
  if (parsed.status === "failing" && parsed.spawn_capa === "on") {
    const capaId = await createCapa({
      title: `Remediation: ${check?.name ?? "failing check"}`,
      description: `Auto-generated from failing check #${parsed.check_id}.${parsed.notes ? "\n\nNote: " + parsed.notes : ""}`,
      severity: "high",
      source_audit_id: null,
      source_item_id: null,
      created_by: user.id,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
    if (check?.control_id) {
      await execute(
        `INSERT INTO control_links (control_id, entity_type, entity_id, created_by)
         VALUES ($1, 'capa', $2, $3) ON CONFLICT DO NOTHING`,
        [check.control_id, capaId, user.id]
      );
    }
  }

  // Notify on failing results — owner and admins should know immediately.
  if (parsed.status === "failing") {
    await notify({
      audience: {
        userIds: check?.owner_user_id ? [check.owner_user_id] : [],
        roles: ["admin"],
      },
      actor: { id: user.id, name: user.displayName, role: user.role },
      kind: "check:failing",
      title: `🔴 Check "${check?.name ?? "Test"}" is failing`,
      body: parsed.notes
        ? `Note: "${parsed.notes}"`
        : `Recorded by ${user.displayName}.`,
      severity: "critical",
      entity: { type: "check", id: parsed.check_id, href: `/tests/${parsed.check_id}` },
    });
  }

  revalidatePath("/tests");
  revalidatePath(`/tests/${parsed.check_id}`);
  revalidatePath("/controls");
}
