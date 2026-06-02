"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, canApproveSops, canEditSops } from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import { createSop, setSopStatus, getSopById } from "./repository";
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

export async function createSopAction(formData: FormData) {
  const user = await requireUser();
  if (!canEditSops(user.role)) {
    throw new Error("You don't have permission to create SOPs.");
  }

  const raw = Object.fromEntries(formData.entries());
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
    created_by: user.id,
  });

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'create', 'sop', $3, $4)`,
    [user.id, user.email, id, JSON.stringify({ title: parsed.title })]
  );

  revalidatePath("/sops");
  redirect(`/sops/${id}`);
}

export async function transitionSopAction(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const next = formData.get("status") as SopStatus;

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
      JSON.stringify({ from: current.status, to: next }),
    ]
  );

  revalidatePath("/sops");
  revalidatePath(`/sops/${id}`);
}
