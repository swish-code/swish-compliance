"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, canEditSops } from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import { createDomain } from "./repository";

const CreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(40)
    .regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, dots, dashes or underscores only"),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional().nullable(),
  sort_order: z.coerce.number().int().optional().nullable(),
  sop_id: z.coerce.number().int().positive().optional().nullable(),
  department_id: z.coerce.number().int().positive().optional().nullable(),
});

function nullEmpty<T extends Record<string, FormDataEntryValue>>(o: T) {
  const out: Record<string, unknown> = { ...o };
  for (const k of Object.keys(out)) if (out[k] === "") out[k] = null;
  return out;
}

export async function createDomainAction(formData: FormData) {
  const user = await requireUser();
  if (!canEditSops(user.role)) throw new Error("Not authorized.");

  const parsed = CreateSchema.parse(nullEmpty(Object.fromEntries(formData.entries())));

  let id: number;
  try {
    id = await createDomain({
      code: parsed.code.toUpperCase(),
      name: parsed.name,
      description: parsed.description ?? null,
      sort_order: parsed.sort_order ?? null,
      sop_id: parsed.sop_id ?? null,
      department_id: parsed.department_id ?? null,
    });
  } catch (e) {
    // Postgres unique_violation on domains.code — surface a friendly
    // message instead of a raw constraint error.
    if (e instanceof Error && /duplicate key/i.test(e.message)) {
      throw new Error(`Domain code "${parsed.code.toUpperCase()}" is already in use.`);
    }
    throw e;
  }

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'create', 'domain', $3, $4)`,
    [user.id, user.email, id, JSON.stringify({ code: parsed.code, name: parsed.name })]
  );

  revalidatePath("/domains");
  redirect(`/domains/${id}`);
}
