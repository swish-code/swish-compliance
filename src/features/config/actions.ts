"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import {
  createOption,
  renameOption,
  toggleOption,
  deleteOption,
  moveOption,
} from "./repository";
import { CONFIG_KINDS } from "./types";

const EDITABLE_KINDS = new Set(
  CONFIG_KINDS.filter((k) => k.editable).map((k) => k.key)
);

function assertEditableKind(kind: string) {
  if (!EDITABLE_KINDS.has(kind)) {
    throw new Error(`"${kind}" is not editable from Config.`);
  }
}

const CreateSchema = z.object({
  kind: z.string().min(1),
  label: z.string().trim().min(1, "Label is required").max(255),
});

const IdLabelSchema = z.object({
  id: z.coerce.number().int().positive(),
  label: z.string().trim().min(1).max(255),
});

const ToggleSchema = z.object({
  id: z.coerce.number().int().positive(),
  active: z.string().optional(),
});

const MoveSchema = z.object({
  id: z.coerce.number().int().positive(),
  direction: z.enum(["up", "down"]),
});

async function audit(adminId: number, adminEmail: string, action: string, optionId: number, details: object) {
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, $3, 'config_option', $4, $5)`,
    [adminId, adminEmail, action, optionId, JSON.stringify(details)]
  );
}

export async function createOptionAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = CreateSchema.parse(Object.fromEntries(formData.entries()));
  assertEditableKind(parsed.kind);
  const id = await createOption({ kind: parsed.kind, label: parsed.label });
  await audit(admin.id, admin.email, "config:create", id, {
    kind: parsed.kind,
    label: parsed.label,
  });
  revalidatePath("/admin/config");
}

export async function renameOptionAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = IdLabelSchema.parse(Object.fromEntries(formData.entries()));
  await renameOption(parsed.id, parsed.label);
  await audit(admin.id, admin.email, "config:rename", parsed.id, {
    new_label: parsed.label,
  });
  revalidatePath("/admin/config");
}

export async function toggleOptionAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = ToggleSchema.parse(Object.fromEntries(formData.entries()));
  const active = parsed.active === "on" || parsed.active === "true";
  await toggleOption(parsed.id, active);
  await audit(admin.id, admin.email, "config:toggle", parsed.id, { is_active: active });
  revalidatePath("/admin/config");
}

export async function deleteOptionAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  await deleteOption(id);
  await audit(admin.id, admin.email, "config:delete", id, {});
  revalidatePath("/admin/config");
}

export async function moveOptionAction(formData: FormData) {
  await requireAdmin();
  const parsed = MoveSchema.parse(Object.fromEntries(formData.entries()));
  await moveOption(parsed.id, parsed.direction);
  revalidatePath("/admin/config");
}
