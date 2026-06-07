"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, canApproveSops, canEditSops } from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import {
  createSop,
  setSopStatus,
  getSopById,
  setSopAttachment,
} from "./repository";
import type { SopStatus } from "./types";

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
});

// Limits (the next.config.ts body limit is 12 MB to give us headroom).
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB raw
const ALLOWED_MIMES = new Set([
  // Images
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  // PDF
  "application/pdf",
  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // PowerPoint
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Plain text & CSV
  "text/plain",
  "text/csv",
]);

type ExtractedFile = {
  dataUrl: string;
  name: string;
  mime: string;
} | null;

/** Read a single File from a FormData field, validate it, and produce a
 *  base64 data URL plus original name + mime for storage. */
async function extractAttachment(
  formData: FormData,
  fieldName = "attachment_file"
): Promise<ExtractedFile> {
  const entry = formData.get(fieldName);
  if (!(entry instanceof File)) return null;
  if (entry.size === 0) return null;
  if (entry.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `File is too large. Max ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB.`
    );
  }
  if (!ALLOWED_MIMES.has(entry.type)) {
    throw new Error(
      `Unsupported file type "${entry.type || "unknown"}". ` +
        `Allowed: PDF, Word, Excel, PowerPoint, image, text, CSV.`
    );
  }
  const buffer = Buffer.from(await entry.arrayBuffer());
  return {
    dataUrl: `data:${entry.type};base64,${buffer.toString("base64")}`,
    name: entry.name || "attachment",
    mime: entry.type,
  };
}

export async function createSopAction(formData: FormData) {
  const user = await requireUser();
  if (!canEditSops(user.role)) {
    throw new Error("You don't have permission to create SOPs.");
  }

  const file = await extractAttachment(formData, "attachment_file");

  const raw = Object.fromEntries(formData.entries());
  delete (raw as Record<string, unknown>).attachment_file;

  const parsed = CreateSchema.parse({
    ...raw,
    file_url: raw.file_url === "" ? null : raw.file_url,
    code: raw.code === "" ? null : raw.code,
    description: raw.description === "" ? null : raw.description,
    brand_id: raw.brand_id === "" ? null : raw.brand_id,
    department_id: raw.department_id === "" ? null : raw.department_id,
    effective_date: raw.effective_date === "" ? null : raw.effective_date,
    review_date: raw.review_date === "" ? null : raw.review_date,
  });

  const id = await createSop({
    ...parsed,
    file_url: parsed.file_url || null,
    attachment_data_url: file?.dataUrl ?? null,
    attachment_name: file?.name ?? null,
    attachment_mime: file?.mime ?? null,
    created_by: user.id,
  });

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
      }),
    ]
  );

  revalidatePath("/sops");
  redirect(`/sops/${id}`);
}

export async function updateSopAttachmentAction(formData: FormData) {
  const user = await requireUser();
  if (!canEditSops(user.role)) {
    throw new Error("You don't have permission to update this SOP.");
  }
  const id = Number(formData.get("id"));
  const current = await getSopById(id);
  if (!current) throw new Error("SOP not found.");

  const file = await extractAttachment(formData, "attachment_file");
  if (!file) throw new Error("No file was provided.");

  await setSopAttachment(id, file.dataUrl, file.name, file.mime);
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'sop:attachment_updated', 'sop', $3, $4)`,
    [user.id, user.email, id, JSON.stringify({ name: file.name, mime: file.mime })]
  );

  revalidatePath(`/sops/${id}`);
}

export async function removeSopAttachmentAction(formData: FormData) {
  const user = await requireUser();
  if (!canEditSops(user.role)) {
    throw new Error("You don't have permission to update this SOP.");
  }
  const id = Number(formData.get("id"));
  await setSopAttachment(id, null, null, null);
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id)
     VALUES ($1, $2, 'sop:attachment_removed', 'sop', $3)`,
    [user.id, user.email, id]
  );
  revalidatePath(`/sops/${id}`);
}

export async function transitionSopAction(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const next = formData.get("status") as SopStatus;
  const commentRaw = (formData.get("comment") ?? "").toString().trim();
  const comment = commentRaw.length > 0 ? commentRaw.slice(0, 1000) : null;

  const current = await getSopById(id);
  if (!current) throw new Error("SOP not found.");

  // Transition rules
  if (next === "pending_review") {
    if (current.status !== "draft" && current.status !== "rejected") {
      throw new Error("Only draft / rejected SOPs can be submitted.");
    }
    if (!canEditSops(user.role) && current.owner_id !== user.id) {
      throw new Error("You don't have permission to submit this SOP.");
    }
  } else if (next === "approved" || next === "rejected") {
    if (current.status !== "pending_review") {
      throw new Error("Only SOPs pending review can be approved or rejected.");
    }
    if (!canApproveSops(user.role)) {
      throw new Error("You don't have permission to approve SOPs.");
    }
    if (next === "rejected" && !comment) {
      throw new Error("A reason is required when rejecting a SOP.");
    }
  } else if (next === "archived") {
    if (!canEditSops(user.role)) {
      throw new Error("You don't have permission to archive SOPs.");
    }
  } else {
    throw new Error(`Unsupported transition to "${next}".`);
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
        ...(comment ? { comment } : {}),
      }),
    ]
  );

  revalidatePath("/sops");
  revalidatePath(`/sops/${id}`);
}
