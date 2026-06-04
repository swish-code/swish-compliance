import "server-only";
import { queryAll, queryOne, execute } from "@/lib/db";
import type { Framework } from "./types";

const FW_SELECT = `
  f.id, f.code, f.name, f.description, f.category, f.is_active,
  f.activated_by, u_a.display_name AS activated_by_name, f.activated_at,
  f.owner_user_id, u_o.display_name AS owner_name,
  f.created_at, f.updated_at,
  (SELECT COUNT(*)::int FROM controls c WHERE c.framework_id = f.id)                          AS control_count,
  (SELECT COUNT(*)::int FROM controls c WHERE c.framework_id = f.id AND c.is_active)          AS active_control_count
FROM frameworks f
LEFT JOIN users u_a ON u_a.id = f.activated_by
LEFT JOIN users u_o ON u_o.id = f.owner_user_id
`;

export async function listFrameworks(): Promise<Framework[]> {
  return queryAll<Framework>(`SELECT ${FW_SELECT} ORDER BY f.is_active DESC, f.name`);
}

export async function getFramework(id: number): Promise<Framework | undefined> {
  return queryOne<Framework>(`SELECT ${FW_SELECT} WHERE f.id = $1`, [id]);
}

export async function setFrameworkActive(
  id: number,
  active: boolean,
  userId: number
): Promise<void> {
  if (active) {
    await execute(
      `UPDATE frameworks SET is_active = TRUE, activated_by = $2, activated_at = NOW() WHERE id = $1`,
      [id, userId]
    );
  } else {
    await execute(`UPDATE frameworks SET is_active = FALSE WHERE id = $1`, [id]);
  }
}

export async function setFrameworkOwner(id: number, ownerId: number | null): Promise<void> {
  await execute(`UPDATE frameworks SET owner_user_id = $2 WHERE id = $1`, [id, ownerId]);
}
