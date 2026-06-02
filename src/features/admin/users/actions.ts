"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import {
  createUser,
  updateUser,
  resetUserPassword,
  emailExists,
  getUserById,
} from "./repository";

const VALID_ROLES = [
  "admin",
  "business_excellence",
  "compliance",
  "auditor",
  "branch_manager",
  "viewer",
] as const;

const CreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  display_name: z.string().trim().min(1, "Name is required"),
  role: z.enum(VALID_ROLES),
  brand_id: z.coerce.number().int().positive().optional().nullable(),
  department_id: z.coerce.number().int().positive().optional().nullable(),
});

const UpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  display_name: z.string().trim().min(1),
  role: z.enum(VALID_ROLES),
  brand_id: z.coerce.number().int().positive().optional().nullable(),
  department_id: z.coerce.number().int().positive().optional().nullable(),
  is_active: z.coerce.boolean(),
});

const ResetPasswordSchema = z.object({
  id: z.coerce.number().int().positive(),
  new_password: z.string().min(6),
});

function clean(o: Record<string, FormDataEntryValue>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    out[k] = v === "" ? null : v;
  }
  return out;
}

export async function createUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const raw = clean(Object.fromEntries(formData.entries()));
  const parsed = CreateSchema.parse(raw);

  if (await emailExists(parsed.email)) {
    throw new Error(`Email "${parsed.email}" is already taken.`);
  }

  const newId = await createUser(parsed);

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'create', 'user', $3, $4)`,
    [
      admin.id,
      admin.email,
      newId,
      JSON.stringify({ email: parsed.email, role: parsed.role }),
    ]
  );

  revalidatePath("/admin/users");
  redirect(`/admin/users/${newId}`);
}

export async function updateUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateSchema.parse({
    ...raw,
    brand_id: raw.brand_id === "" ? null : raw.brand_id,
    department_id: raw.department_id === "" ? null : raw.department_id,
    is_active: raw.is_active === "on" || raw.is_active === "true",
  });

  const before = await getUserById(parsed.id);
  if (!before) throw new Error("User not found.");

  // Safety: don't let the last admin demote / deactivate themselves
  if (
    before.role === "admin" &&
    (parsed.role !== "admin" || !parsed.is_active) &&
    before.id === admin.id
  ) {
    throw new Error("You can't demote or deactivate your own admin account.");
  }

  await updateUser(parsed);

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'update', 'user', $3, $4)`,
    [
      admin.id,
      admin.email,
      parsed.id,
      JSON.stringify({
        before: { role: before.role, is_active: before.is_active },
        after: { role: parsed.role, is_active: parsed.is_active },
      }),
    ]
  );

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${parsed.id}`);
}

export async function resetPasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = ResetPasswordSchema.parse(Object.fromEntries(formData.entries()));

  await resetUserPassword(parsed.id, parsed.new_password);

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id)
     VALUES ($1, $2, 'reset_password', 'user', $3)`,
    [admin.id, admin.email, parsed.id]
  );

  revalidatePath(`/admin/users/${parsed.id}`);
}
