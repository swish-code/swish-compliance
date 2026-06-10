"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/guard";
import { execute } from "@/lib/db";
import { getSopById } from "@/features/sops/repository";
import {
  hasUserAcknowledged,
  recordAcknowledgment,
} from "./repository";

/**
 * Record that the current user has read & understood an approved SOP.
 * - Only valid on SOPs whose status is 'approved'.
 * - Stores user-agent and best-effort IP so the audit trail can verify
 *   who clicked from where.
 * - Idempotent: a second click for the same (sop, user) is a no-op.
 */
export async function acknowledgeSopAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const sopId = Number(formData.get("sop_id"));
  if (!Number.isFinite(sopId) || sopId <= 0) {
    throw new Error("Invalid SOP id.");
  }

  const sop = await getSopById(sopId);
  if (!sop) throw new Error("SOP not found.");
  if (sop.status !== "approved") {
    throw new Error("Only approved SOPs can be acknowledged.");
  }

  if (await hasUserAcknowledged(sopId, user.id)) {
    revalidatePath(`/sops/${sopId}`);
    revalidatePath("/my-work");
    return;
  }

  // Pull IP / user-agent from the request headers. We keep them best-effort:
  // proxies vary, so we accept whatever the platform sets.
  const h = await headers();
  const userAgent = h.get("user-agent");
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;

  await recordAcknowledgment({
    sop_id: sopId,
    user_id: user.id,
    user_role: user.role,
    user_agent: userAgent,
    ip_address: ip,
  });

  // Audit trail entry so the Approval History on the SOP page shows
  // the acknowledgment alongside approvals.
  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'sop:acknowledged', 'sop', $3, $4)`,
    [
      user.id,
      user.email,
      sopId,
      JSON.stringify({
        user_name: user.displayName,
        user_role: user.role,
      }),
    ]
  );

  revalidatePath(`/sops/${sopId}`);
  revalidatePath("/my-work");
}
