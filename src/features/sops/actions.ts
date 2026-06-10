"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  requireUser,
  canCreateSops,
  canEditSops,
} from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import {
  createSop,
  setSopStatus,
  getSopById,
  setSopAttachment,
} from "./repository";
import {
  findTransition,
  isSopLocked,
  type SopStatus,
} from "./types";
import { notify } from "@/features/notifications/service";
import {
  extractAttachment as extractAttachmentShared,
} from "@/lib/attachments";
import { eligibleUserIds } from "./acknowledgments/repository";

/** Build the notification audience + copy for a given SOP transition. */
type SopNotifPlan = {
  audience: { roles?: string[]; userIds?: number[] };
  title: string;
  body: string;
  severity: "info" | "success" | "warning" | "critical";
};

function planSopNotification(
  next: SopStatus,
  sopTitle: string,
  sopId: number,
  ownerId: number | null,
  actorName: string,
  comment: string | null
): SopNotifPlan | null {
  const ownerArr = ownerId ? [ownerId] : [];
  switch (next) {
    case "pending_compliance":
      return {
        audience: { roles: ["compliance"] },
        title: `New SOP awaiting Compliance review: "${sopTitle}"`,
        body: `Submitted by ${actorName}. Open it to approve or reject.`,
        severity: "info",
      };
    case "pending_business_excellence":
      return {
        audience: { roles: ["business_excellence"], userIds: ownerArr },
        title: `SOP forwarded to Business Excellence: "${sopTitle}"`,
        body: comment
          ? `Compliance approved with note: "${comment}"`
          : `Compliance approved and forwarded to BE.`,
        severity: "info",
      };
    case "pending_ceo":
      return {
        audience: { roles: ["ceo"], userIds: ownerArr },
        title: `SOP awaiting final CEO approval: "${sopTitle}"`,
        body: comment
          ? `Business Excellence approved with note: "${comment}"`
          : `Business Excellence approved and forwarded to the CEO.`,
        severity: "info",
      };
    case "approved":
      return {
        audience: {
          roles: ["compliance", "business_excellence", "admin"],
          userIds: ownerArr,
        },
        title: `SOP "${sopTitle}" was given final CEO approval 🎉`,
        body: comment
          ? `CEO comment: "${comment}". The SOP is now locked and active.`
          : `The SOP is now locked and active.`,
        severity: "success",
      };
    case "returned_to_dm":
      return {
        audience: { userIds: ownerArr },
        title: `Your SOP "${sopTitle}" was returned for changes`,
        body: comment ? `Reviewer comment: "${comment}"` : "Review the comment and resubmit.",
        severity: "warning",
      };
    case "returned_to_compliance":
      return {
        audience: { roles: ["compliance"], userIds: ownerArr },
        title: `SOP "${sopTitle}" was returned to Compliance`,
        body: comment
          ? `BE comment: "${comment}". Apply the changes and resubmit.`
          : `Apply the requested changes and resubmit.`,
        severity: "warning",
      };
    case "returned_to_be":
      return {
        audience: { roles: ["business_excellence"], userIds: ownerArr },
        title: `SOP "${sopTitle}" was returned to Business Excellence`,
        body: comment
          ? `CEO comment: "${comment}". Apply the changes and resubmit.`
          : `Apply the requested changes and resubmit.`,
        severity: "warning",
      };
    case "archived":
      return {
        audience: { roles: ["admin"], userIds: ownerArr },
        title: `SOP "${sopTitle}" was archived`,
        body: `${actorName} archived the SOP.`,
        severity: "info",
      };
    default:
      return null;
  }
}

/** Trim, drop empty strings to null, and cap at 30k characters so a single
 *  cell from an Excel paste can't blow up the form. */
const sectionField = z
  .string()
  .trim()
  .max(30000, "Section content is too long")
  .optional()
  .nullable();

const CreateSchema = z.object({
  code: z.string().trim().optional().nullable(),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional().nullable(),
  version: z.string().trim().optional(),
  file_url: z.string().trim().url().optional().nullable().or(z.literal("")),
  brand_id: z.coerce.number().int().positive().optional().nullable(),
  department_id: z.coerce.number().int().positive().optional().nullable(),
  effective_date: z.string().optional().nullable(),
  review_date: z.string().optional().nullable(),
  // 10 structured sections
  purpose:                sectionField,
  scope:                  sectionField,
  process_flow:           sectionField,
  roles_responsibilities: sectionField,
  inputs_outputs:         sectionField,
  tools_forms:            sectionField,
  kpis:                   sectionField,
  ownership_review:       sectionField,
  appendices:             sectionField,
  signatures_approval:    sectionField,
});

// Thin wrapper around the shared @/lib/attachments helper so the existing
// call sites in this file keep working unchanged.
async function extractAttachment(
  formData: FormData,
  fieldName = "attachment_file"
) {
  return extractAttachmentShared(formData, fieldName);
}

/**
 * SOP creation. Per the v2 workflow, only the Department Manager (and admin
 * for support) can create SOPs, and the new SOP goes straight into the
 * Compliance team's review queue.
 */
export async function createSopAction(formData: FormData) {
  const user = await requireUser();
  if (!canCreateSops(user.role)) {
    throw new Error("Only Department Managers can create SOPs.");
  }

  const file = await extractAttachment(formData, "attachment_file");

  const raw = Object.fromEntries(formData.entries());
  delete (raw as Record<string, unknown>).attachment_file;

  // Normalize: turn empty strings into null so the DB stores NULL, not "".
  const blankToNull = (v: FormDataEntryValue | undefined) =>
    v === "" || v === undefined ? null : v;

  const parsed = CreateSchema.parse({
    ...raw,
    file_url: blankToNull(raw.file_url),
    code: blankToNull(raw.code),
    description: blankToNull(raw.description),
    brand_id: blankToNull(raw.brand_id),
    department_id: blankToNull(raw.department_id),
    effective_date: blankToNull(raw.effective_date),
    review_date: blankToNull(raw.review_date),
    purpose:                blankToNull(raw.purpose),
    scope:                  blankToNull(raw.scope),
    process_flow:           blankToNull(raw.process_flow),
    roles_responsibilities: blankToNull(raw.roles_responsibilities),
    inputs_outputs:         blankToNull(raw.inputs_outputs),
    tools_forms:            blankToNull(raw.tools_forms),
    kpis:                   blankToNull(raw.kpis),
    ownership_review:       blankToNull(raw.ownership_review),
    appendices:             blankToNull(raw.appendices),
    signatures_approval:    blankToNull(raw.signatures_approval),
  });

  const id = await createSop({
    ...parsed,
    file_url: parsed.file_url || null,
    attachment_data_url: file?.dataUrl ?? null,
    attachment_name: file?.name ?? null,
    attachment_mime: file?.mime ?? null,
    created_by: user.id,
  });

  // New SOPs are not drafts in v2 — they go straight into the Compliance queue.
  await setSopStatus(id, "pending_compliance", null);

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'create', 'sop', $3, $4)`,
    [
      user.id,
      user.email,
      id,
      JSON.stringify({
        title: parsed.title,
        attachment: file?.name ?? null,
        user_name: user.displayName,
        user_role: user.role,
      }),
    ]
  );
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'sop:pending_compliance', 'sop', $3, $4)`,
    [
      user.id,
      user.email,
      id,
      JSON.stringify({
        from: "draft",
        to: "pending_compliance",
        user_name: user.displayName,
        user_role: user.role,
      }),
    ]
  );

  // Notify the Compliance team about the new SOP awaiting their review.
  const plan = planSopNotification(
    "pending_compliance",
    parsed.title,
    id,
    user.id,
    user.displayName,
    null
  );
  if (plan) {
    await notify({
      audience: plan.audience,
      actor: { id: user.id, name: user.displayName, role: user.role },
      kind: "sop:pending_compliance",
      title: plan.title,
      body: plan.body,
      severity: plan.severity,
      entity: { type: "sop", id, href: `/sops/${id}` },
    });
  }

  revalidatePath("/sops");
  redirect(`/sops/${id}`);
}

export async function updateSopAttachmentAction(formData: FormData) {
  const user = await requireUser();
  if (!canEditSops(user.role) && user.role !== "department_manager") {
    throw new Error("You don't have permission to update this SOP.");
  }
  const id = Number(formData.get("id"));
  const current = await getSopById(id);
  if (!current) throw new Error("SOP not found.");
  if (isSopLocked(current.status)) {
    throw new Error("This SOP is locked. No further modifications are allowed.");
  }

  const file = await extractAttachment(formData, "attachment_file");
  if (!file) throw new Error("No file was provided.");

  await setSopAttachment(id, file.dataUrl, file.name, file.mime);
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'sop:attachment_updated', 'sop', $3, $4)`,
    [
      user.id,
      user.email,
      id,
      JSON.stringify({
        name: file.name,
        mime: file.mime,
        user_name: user.displayName,
        user_role: user.role,
      }),
    ]
  );
  revalidatePath(`/sops/${id}`);
}

export async function removeSopAttachmentAction(formData: FormData) {
  const user = await requireUser();
  if (!canEditSops(user.role) && user.role !== "department_manager") {
    throw new Error("You don't have permission to update this SOP.");
  }
  const id = Number(formData.get("id"));
  const current = await getSopById(id);
  if (!current) throw new Error("SOP not found.");
  if (isSopLocked(current.status)) {
    throw new Error("This SOP is locked. No further modifications are allowed.");
  }

  await setSopAttachment(id, null, null, null);
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'sop:attachment_removed', 'sop', $3, $4)`,
    [
      user.id,
      user.email,
      id,
      JSON.stringify({ user_name: user.displayName, user_role: user.role }),
    ]
  );
  revalidatePath(`/sops/${id}`);
}

/**
 * Workflow transition. Validates against the central SOP_TRANSITIONS map:
 *   - the transition must exist
 *   - the caller's role must be in the transition's allowedRoles
 *   - if the transition requires a comment, it must be present
 * The comment is persisted with the user's name and role in audit_logs.details
 * so the Approval History can render it later even if the user changes role.
 */
export async function transitionSopAction(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const next = formData.get("status") as SopStatus;
  const commentRaw = (formData.get("comment") ?? "").toString().trim();
  const comment = commentRaw.length > 0 ? commentRaw.slice(0, 2000) : null;

  const current = await getSopById(id);
  if (!current) throw new Error("SOP not found.");
  if (isSopLocked(current.status) && next !== "archived") {
    throw new Error("This SOP is locked. No further modifications are allowed.");
  }

  const transition = findTransition(current.status, next);
  if (!transition) {
    throw new Error(
      `Transition from "${current.status}" to "${next}" is not allowed.`
    );
  }
  if (!transition.allowedRoles.includes(user.role)) {
    throw new Error(`Your role (${user.role}) can't perform this action.`);
  }
  if (transition.commentRequired && !comment) {
    throw new Error("A comment is required for this action.");
  }

  await setSopStatus(id, next, next === "approved" ? user.id : null);

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, $3, 'sop', $4, $5)`,
    [
      user.id,
      user.email,
      `sop:${next}`,
      id,
      JSON.stringify({
        from: current.status,
        to: next,
        user_name: user.displayName,
        user_role: user.role,
        ...(comment ? { comment } : {}),
      }),
    ]
  );

  // Fan the event out to the right audience via the notification service.
  const plan = planSopNotification(
    next,
    current.title,
    id,
    current.created_by ?? current.owner_id,
    user.displayName,
    comment
  );
  if (plan) {
    await notify({
      audience: plan.audience,
      actor: { id: user.id, name: user.displayName, role: user.role },
      kind: `sop:${next}`,
      title: plan.title,
      body: plan.body,
      severity: plan.severity,
      entity: { type: "sop", id, href: `/sops/${id}` },
    });
  }

  // On final approval, fire a SECOND notification to everyone who is
  // expected to read the new SOP and click "I've read and understood".
  // This is the acknowledgment audience: active users in the same
  // department (or all users if the SOP has no department), plus admins.
  if (next === "approved") {
    const ackTargets = await eligibleUserIds(id);
    if (ackTargets.length > 0) {
      await notify({
        audience: {
          userIds: ackTargets,
          excludeActorId: user.id,
        },
        actor: { id: user.id, name: user.displayName, role: user.role },
        kind: "sop:please_acknowledge",
        title: `📖 Please read & acknowledge: "${current.title}"`,
        body: "A new SOP is now active. Open it and confirm you've read & understood.",
        severity: "info",
        entity: { type: "sop", id, href: `/sops/${id}` },
      });
    }
  }

  revalidatePath("/sops");
  revalidatePath(`/sops/${id}`);
  revalidatePath("/my-work");
}
