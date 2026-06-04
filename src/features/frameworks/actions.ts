"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import { setFrameworkActive, setFrameworkOwner, getFramework } from "./repository";

const ToggleSchema = z.object({
  id: z.coerce.number().int().positive(),
  activate: z.string().optional(),
});

const OwnerSchema = z.object({
  id: z.coerce.number().int().positive(),
  owner_user_id: z.coerce.number().int().positive().optional().nullable(),
});

export async function toggleFrameworkAction(formData: FormData) {
  const admin = await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ToggleSchema.parse(raw);
  const before = await getFramework(parsed.id);
  if (!before) throw new Error("Framework not found.");

  const activate = parsed.activate === "true" || parsed.activate === "on";
  await setFrameworkActive(parsed.id, activate, admin.id);

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, $3, 'framework', $4, $5)`,
    [
      admin.id,
      admin.email,
      activate ? "framework:activate" : "framework:deactivate",
      parsed.id,
      JSON.stringify({ code: before.code }),
    ]
  );

  revalidatePath("/frameworks");
  revalidatePath(`/frameworks/${parsed.id}`);
  revalidatePath("/roadmap");
}

export async function setFrameworkOwnerAction(formData: FormData) {
  const admin = await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = OwnerSchema.parse({
    ...raw,
    owner_user_id: raw.owner_user_id === "" ? null : raw.owner_user_id,
  });
  await setFrameworkOwner(parsed.id, parsed.owner_user_id ?? null);
  revalidatePath(`/frameworks/${parsed.id}`);
}
