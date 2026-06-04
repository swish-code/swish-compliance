"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, canEditSops } from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import {
  createControl,
  linkControl,
  unlinkControl,
  recomputeControlHealth,
} from "./repository";

const CreateSchema = z.object({
  code: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional().nullable(),
  framework_id: z.coerce.number().int().positive().optional().nullable(),
  category: z.string().trim().optional().nullable(),
  owner_user_id: z.coerce.number().int().positive().optional().nullable(),
});

const LinkSchema = z.object({
  control_id: z.coerce.number().int().positive(),
  entity_type: z.enum(["sop", "document", "audit", "check", "capa"]),
  entity_id: z.coerce.number().int().positive(),
});

function nullEmpty<T extends Record<string, FormDataEntryValue>>(o: T) {
  const out: Record<string, unknown> = { ...o };
  for (const k of Object.keys(out)) if (out[k] === "") out[k] = null;
  return out;
}

export async function createControlAction(formData: FormData) {
  const user = await requireUser();
  if (!canEditSops(user.role)) throw new Error("Not authorized.");
  const parsed = CreateSchema.parse(nullEmpty(Object.fromEntries(formData.entries())));
  const id = await createControl({ ...parsed, created_by: user.id });
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'create', 'control', $3, $4)`,
    [user.id, user.email, id, JSON.stringify({ name: parsed.name })]
  );
  revalidatePath("/controls");
  redirect(`/controls/${id}`);
}

export async function linkControlAction(formData: FormData) {
  const user = await requireUser();
  if (!canEditSops(user.role)) throw new Error("Not authorized.");
  const parsed = LinkSchema.parse(Object.fromEntries(formData.entries()));
  await linkControl({ ...parsed, created_by: user.id });
  await recomputeControlHealth(parsed.control_id);
  revalidatePath(`/controls/${parsed.control_id}`);
  revalidatePath("/controls");
}

export async function unlinkControlAction(formData: FormData) {
  const user = await requireUser();
  if (!canEditSops(user.role)) throw new Error("Not authorized.");
  const linkId = Number(formData.get("link_id"));
  const controlId = Number(formData.get("control_id"));
  await unlinkControl(linkId);
  await recomputeControlHealth(controlId);
  revalidatePath(`/controls/${controlId}`);
}

export async function recomputeAllControlsAction() {
  await requireUser();
  const { rows } = await import("@/lib/db").then((m) =>
    m.pool.query<{ id: number }>(`SELECT id FROM controls WHERE is_active`)
  );
  for (const r of rows) {
    await recomputeControlHealth(r.id);
  }
  revalidatePath("/controls");
  revalidatePath("/reports");
}
