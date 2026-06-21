"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import {
  createOrgUnit,
  updateOrgUnit,
  deleteOrgUnit,
} from "./repository";

// Admin-only. Reuse the existing admin guard.
function assertAdmin(role: string) {
  if (role !== "admin") throw new Error("Not authorized.");
}

const CreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(40)
    .regex(/^[A-Za-z0-9.\-_]+$/, "Code may only contain letters, digits, dot, dash, underscore."),
  name: z.string().trim().min(1, "Name is required.").max(200),
  parent_id: z.coerce.number().int().positive().optional().nullable(),
});

const UpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  sort_order: z.coerce.number().int().optional(),
  is_active: z.coerce.boolean().optional(),
});

const DeleteSchema = z.object({
  id: z.coerce.number().int().positive(),
});

function blank(v: FormDataEntryValue | undefined) {
  return v === "" || v === undefined ? null : v;
}

export async function createOrgUnitAction(formData: FormData) {
  const user = await requireUser();
  assertAdmin(user.role);
  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateSchema.parse({
    code: raw.code,
    name: raw.name,
    parent_id: blank(raw.parent_id),
  });
  const id = await createOrgUnit({
    code: parsed.code,
    name: parsed.name,
    parent_id: parsed.parent_id ?? null,
  });
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'create', 'org_unit', $3, $4)`,
    [user.id, user.email, id, JSON.stringify({ code: parsed.code, name: parsed.name })]
  );
  revalidatePath("/admin/org-units");
}

export async function updateOrgUnitAction(formData: FormData) {
  const user = await requireUser();
  assertAdmin(user.role);
  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateSchema.parse({
    id: raw.id,
    name: raw.name,
    sort_order: raw.sort_order,
    is_active: raw.is_active === "on" || raw.is_active === "true",
  });
  await updateOrgUnit(parsed.id, parsed);
  revalidatePath("/admin/org-units");
}

export async function deleteOrgUnitAction(formData: FormData) {
  const user = await requireUser();
  assertAdmin(user.role);
  const parsed = DeleteSchema.parse({ id: formData.get("id") });
  await deleteOrgUnit(parsed.id);
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'delete', 'org_unit', $3, $4)`,
    [user.id, user.email, parsed.id, JSON.stringify({ id: parsed.id })]
  );
  revalidatePath("/admin/org-units");
}
