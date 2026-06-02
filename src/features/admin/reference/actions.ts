"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { execute } from "@/lib/db";

const NameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
});

const ToggleSchema = z.object({
  id: z.coerce.number().int().positive(),
  is_active: z.string().optional(),
});

type Table = "brands" | "departments";

async function audit(
  adminId: number,
  adminEmail: string,
  action: string,
  table: Table,
  entityId: number,
  details: object
) {
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      adminId,
      adminEmail,
      `${table.slice(0, -1)}:${action}`,
      table.slice(0, -1),
      entityId,
      JSON.stringify(details),
    ]
  );
}

function makeActions(table: Table, revalidatePathStr: string) {
  return {
    async create(formData: FormData) {
      const admin = await requireAdmin();
      const parsed = NameSchema.parse(Object.fromEntries(formData.entries()));
      const result = await execute(
        `INSERT INTO ${table} (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [parsed.name]
      );
      if (result === 0) {
        throw new Error(`"${parsed.name}" already exists.`);
      }
      const { rows } = await import("@/lib/db").then((m) =>
        m.pool.query<{ id: number }>(`SELECT id FROM ${table} WHERE name = $1`, [parsed.name])
      );
      await audit(admin.id, admin.email, "create", table, rows[0].id, { name: parsed.name });
      revalidatePath(revalidatePathStr);
    },

    async rename(formData: FormData) {
      const admin = await requireAdmin();
      const id = Number(formData.get("id"));
      const parsed = NameSchema.parse(Object.fromEntries(formData.entries()));
      await execute(`UPDATE ${table} SET name = $1 WHERE id = $2`, [parsed.name, id]);
      await audit(admin.id, admin.email, "rename", table, id, { to: parsed.name });
      revalidatePath(revalidatePathStr);
    },

    async toggle(formData: FormData) {
      const admin = await requireAdmin();
      const { id, is_active } = ToggleSchema.parse(Object.fromEntries(formData.entries()));
      const next = is_active === "on" || is_active === "true";
      await execute(`UPDATE ${table} SET is_active = $1 WHERE id = $2`, [next, id]);
      await audit(admin.id, admin.email, "toggle_active", table, id, { is_active: next });
      revalidatePath(revalidatePathStr);
    },
  };
}

const brandActions = makeActions("brands", "/admin/brands");
const deptActions = makeActions("departments", "/admin/departments");

export async function createBrandAction(fd: FormData) { return brandActions.create(fd); }
export async function renameBrandAction(fd: FormData) { return brandActions.rename(fd); }
export async function toggleBrandAction(fd: FormData) { return brandActions.toggle(fd); }

export async function createDepartmentAction(fd: FormData) { return deptActions.create(fd); }
export async function renameDepartmentAction(fd: FormData) { return deptActions.rename(fd); }
export async function toggleDepartmentAction(fd: FormData) { return deptActions.toggle(fd); }
