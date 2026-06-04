"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, canApproveSops } from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import { createCapa, transitionCapa, getCapa } from "./repository";
import type { CapaStatus } from "./types";

const CreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional().nullable(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  brand_id: z.coerce.number().int().positive().optional().nullable(),
  department_id: z.coerce.number().int().positive().optional().nullable(),
  assigned_to: z.coerce.number().int().positive().optional().nullable(),
  due_date: z.string().optional().nullable(),
});

const TransitionSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(["open", "in_progress", "submitted", "verified", "closed", "rejected"]),
  resolution_note: z.string().optional().nullable(),
  evidence_url: z.string().optional().nullable(),
});

export async function createCapaAction(formData: FormData) {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateSchema.parse({
    ...raw,
    description: raw.description === "" ? null : raw.description,
    brand_id: raw.brand_id === "" ? null : raw.brand_id,
    department_id: raw.department_id === "" ? null : raw.department_id,
    assigned_to: raw.assigned_to === "" ? null : raw.assigned_to,
    due_date: raw.due_date === "" ? null : raw.due_date,
  });
  const id = await createCapa({ ...parsed, created_by: user.id });
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'create', 'capa', $3, $4)`,
    [user.id, user.email, id, JSON.stringify({ title: parsed.title })]
  );
  revalidatePath("/capa");
  redirect(`/capa/${id}`);
}

export async function transitionCapaAction(formData: FormData) {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());
  const parsed = TransitionSchema.parse({
    ...raw,
    resolution_note: raw.resolution_note === "" ? null : raw.resolution_note,
    evidence_url: raw.evidence_url === "" ? null : raw.evidence_url,
  });

  const before = await getCapa(parsed.id);
  if (!before) throw new Error("CAPA not found.");

  // Permission rules
  const next: CapaStatus = parsed.status;
  if (next === "verified" || next === "closed" || next === "rejected") {
    if (!canApproveSops(user.role)) {
      throw new Error("Only Admin or Business Excellence can verify CAPAs.");
    }
  }
  if (next === "submitted" || next === "in_progress") {
    const isAssignee = before.assigned_to === user.id;
    if (!isAssignee && !canApproveSops(user.role) && user.role !== "compliance") {
      throw new Error("Only the assignee or compliance team can update this CAPA.");
    }
  }

  await transitionCapa(parsed.id, next, {
    resolution_note: parsed.resolution_note ?? null,
    evidence_url: parsed.evidence_url ?? null,
    verified_by: (next === "verified" || next === "closed") ? user.id : null,
  });

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, $3, 'capa', $4, $5)`,
    [
      user.id,
      user.email,
      `capa:${next}`,
      parsed.id,
      JSON.stringify({ from: before.status, to: next }),
    ]
  );

  revalidatePath("/capa");
  revalidatePath(`/capa/${parsed.id}`);
}
