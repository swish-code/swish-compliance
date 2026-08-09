"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireUser, canDeleteOrArchive, canEditSops } from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import {
  setFrameworkActive,
  setFrameworkOwner,
  getFramework,
  createFramework,
} from "./repository";
import { notify } from "@/features/notifications/service";

const CreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(40)
    .regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, dots, dashes or underscores only"),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional().nullable(),
  category: z.string().trim().optional().nullable(),
  domain_id: z.coerce.number().int().positive().optional().nullable(),
  owner_user_id: z.coerce.number().int().positive().optional().nullable(),
  owner_label: z.string().trim().optional().nullable(),
  audit_frequency: z.string().trim().optional().nullable(),
  is_active: z.string().optional(),
  sop_id: z.coerce.number().int().positive().optional().nullable(),
  department_id: z.coerce.number().int().positive().optional().nullable(),
});

function nullEmpty<T extends Record<string, FormDataEntryValue>>(o: T) {
  const out: Record<string, unknown> = { ...o };
  for (const k of Object.keys(out)) if (out[k] === "") out[k] = null;
  return out;
}

const ToggleSchema = z.object({
  id: z.coerce.number().int().positive(),
  activate: z.string().optional(),
});

const OwnerSchema = z.object({
  id: z.coerce.number().int().positive(),
  owner_user_id: z.coerce.number().int().positive().optional().nullable(),
});

export async function toggleFrameworkAction(formData: FormData) {
  // Deactivate = archive; gated to admin + compliance (user spec).
  const admin = await requireUser();
  if (!canDeleteOrArchive(admin.role)) {
    throw new Error("Only admin or compliance can activate/deactivate frameworks.");
  }
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

export async function createFrameworkAction(formData: FormData) {
  const user = await requireUser();
  if (!canEditSops(user.role)) throw new Error("Not authorized.");

  const parsed = CreateSchema.parse(nullEmpty(Object.fromEntries(formData.entries())));
  const isActive = parsed.is_active === "true" || parsed.is_active === "on";

  let id: number;
  try {
    id = await createFramework({
      code: parsed.code.toUpperCase(),
      name: parsed.name,
      description: parsed.description ?? null,
      category: parsed.category ?? null,
      domain_id: parsed.domain_id ?? null,
      owner_user_id: parsed.owner_user_id ?? null,
      owner_label: parsed.owner_label ?? null,
      audit_frequency: parsed.audit_frequency ?? null,
      is_active: isActive,
      created_by: user.id,
      sop_id: parsed.sop_id ?? null,
      department_id: parsed.department_id ?? null,
    });
  } catch (e) {
    if (e instanceof Error && /duplicate key/i.test(e.message)) {
      throw new Error(`Framework code "${parsed.code.toUpperCase()}" is already in use.`);
    }
    throw e;
  }

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'create', 'framework', $3, $4)`,
    [user.id, user.email, id, JSON.stringify({ code: parsed.code, name: parsed.name })]
  );

  revalidatePath("/frameworks");
  if (parsed.domain_id) revalidatePath(`/domains/${parsed.domain_id}`);
  redirect(`/frameworks/${id}`);
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
