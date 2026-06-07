import "server-only";
import { queryAll, queryOne, execute } from "@/lib/db";
import type { Notification } from "./types";

export async function listForUser(
  userId: number,
  opts: { limit?: number; unreadOnly?: boolean } = {}
): Promise<Notification[]> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
  if (opts.unreadOnly) {
    return queryAll<Notification>(
      `SELECT * FROM notifications
       WHERE user_id = $1 AND is_read = FALSE
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
  }
  return queryAll<Notification>(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
}

export async function unreadCount(userId: number): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n
     FROM notifications
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return row?.n ?? 0;
}

export async function markRead(id: number, userId: number): Promise<void> {
  await execute(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW()
     WHERE id = $1 AND user_id = $2 AND is_read = FALSE`,
    [id, userId]
  );
}

export async function markAllRead(userId: number): Promise<number> {
  return execute(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW()
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
}

export async function deleteOne(id: number, userId: number): Promise<void> {
  await execute(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

export async function deleteAllRead(userId: number): Promise<number> {
  return execute(
    `DELETE FROM notifications WHERE user_id = $1 AND is_read = TRUE`,
    [userId]
  );
}
