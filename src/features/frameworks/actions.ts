"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import { setFrameworkActive, setFrameworkOwner, getFramework } from "./repository";
import { notify } from "@/features/notifications/service";

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

  // Tell the wider compliance org about the activation/deactivation.
  await notify({
    audience: { roles: ["compliance", "business_excellence", "admin"] },
    actor: { id: admin.id, name: admin.displayName, role: admin.role },
    kind: activate ? "framework:activated" : "framework:deactivated",
    title: activate
      ? `Framework "${before.name}" was activated`
      : `Framework "${before.name}" was deactivated`,
    body: activate
      ? "Controls under this framework are now in scope for reporting."
      : "Controls under this framework are no longer in scope.",
    severity: activate ? "success" : "info",
    entity: { type: "framework", id: parsed.id, href: `/frameworks/${parsed.id}` },
  });

  revalidatePath("/frameworks");
  revalidatePath(`/frameworks/${parsed.id}`);
  revalidatePath("/roadmap");
}

export async function setFrameworkOwnerAction(formData: FormData) {
  await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = OwnerSchema.parse({
    ...raw,
    owner_user_id: raw.owner_user_id === "" ? null : raw.owner_user_id,
  });
  await setFrameworkOwner(parsed.id, parsed.owner_user_id ?? null);
  revalidatePath(`/frameworks/${parsed.id}`);
}
