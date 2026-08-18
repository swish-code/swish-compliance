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
import { notify } from "@/features/notifications/service";

// Must match the catalog in src/lib/auth/guard.ts (USER_ROLES) — those
// are the roles the rest of the app reasons about. SOP workflow v2 swapped
// branch_manager → department_manager and added ceo as the final approver.
const VALID_ROLES = [
  "admin",
  "ceo",
  "business_excellence",
  "compliance",
  "opex",
  "department_manager",
  "auditor",
  "viewer",
] as const;

const CreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  display_name: z.string().trim().min(1, "Name is required"),
  role: z.enum(VALID_ROLES),
});

const UpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  display_name: z.string().trim().min(1),
  role: z.enum(VALID_ROLES),
  is_active: z.boolean(),
});

const ResetPasswordSchema = z.object({
  id: z.coerce.number().int().positive(),
  new_password: z.string().min(6),
});

/** Pull all values for a repeated form field name (e.g. brand_ids). */
function getAllNumeric(formData: FormData, name: string): number[] {
  const out: number[] = [];
  for (const v of formData.getAll(name)) {
    if (typeof v === "string" && v !== "") {
      const n = Number(v);
      if (Number.isInteger(n) && n > 0) out.push(n);
    }
  }
  return Array.from(new Set(out));
}

export async function createUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = CreateSchema.parse({
    email: formData.get("email"),
    password: formData.get("password"),
    display_name: formData.get("display_name"),
    role: formData.get("role"),
  });

  if (await emailExists(parsed.email)) {
    throw new Error(`Email "${parsed.email}" is already taken.`);
  }

  const brand_ids = getAllNumeric(formData, "brand_ids");
  const department_ids = getAllNumeric(formData, "department_ids");
  const domain_ids = getAllNumeric(formData, "domain_ids");

  const newId = await createUser({ ...parsed, brand_ids, department_ids, domain_ids });

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'create', 'user', $3, $4)`,
    [
      admin.id,
      admin.email,
      newId,
      JSON.stringify({
        email: parsed.email,
        role: parsed.role,
        brand_ids,
        department_ids,
        domain_ids,
      }),
    ]
  );

  // Welcome the new user with a notification on their account.
  await notify({
    audience: { userIds: [newId] },
    actor: { id: admin.id, name: admin.displayName, role: admin.role },
    kind: "user:created",
    title: `Welcome to Swish Compliance, ${parsed.display_name}!`,
    body: `Your account was created by ${admin.displayName} with the role: ${parsed.role}. Change your password from your profile after first login.`,
    severity: "info",
  });

  revalidatePath("/admin/config");
  redirect(`/admin/users/${newId}`);
}

export async function updateUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = UpdateSchema.parse({
    id: formData.get("id"),
    display_name: formData.get("display_name"),
    role: formData.get("role"),
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  });

  const before = await getUserById(parsed.id);
  if (!before) throw new Error("User not found.");

  // Safety: don't let an admin demote / deactivate their own account
  if (
    before.role === "admin" &&
    (parsed.role !== "admin" || !parsed.is_active) &&
    before.id === admin.id
  ) {
    throw new Error("You can't demote or deactivate your own admin account.");
  }

  const brand_ids = getAllNumeric(formData, "brand_ids");
  const department_ids = getAllNumeric(formData, "department_ids");
  const domain_ids = getAllNumeric(formData, "domain_ids");

  await updateUser({ ...parsed, brand_ids, department_ids, domain_ids });

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'update', 'user', $3, $4)`,
    [
      admin.id,
      admin.email,
      parsed.id,
      JSON.stringify({
        before: {
          role: before.role,
          is_active: before.is_active,
          brand_ids: before.brand_ids,
          department_ids: before.department_ids,
          domain_ids: before.domain_ids,
        },
        after: {
          role: parsed.role,
          is_active: parsed.is_active,
          brand_ids,
          department_ids,
          domain_ids,
        },
      }),
    ]
  );

  // If the role was changed, notify the affected user.
  if (before.role !== parsed.role) {
    await notify({
      audience: { userIds: [parsed.id] },
      actor: { id: admin.id, name: admin.displayName, role: admin.role },
      kind: "user:role_changed",
      title: `Your role has changed to ${parsed.role.replace("_", " ")}`,
      body: `${admin.displayName} updated your role from ${before.role.replace("_", " ")} to ${parsed.role.replace("_", " ")}.`,
      severity: "info",
    });
  }

  revalidatePath("/admin/config");
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
