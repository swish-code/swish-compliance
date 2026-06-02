import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth/session";
import { execute } from "@/lib/db";

export async function POST() {
  const user = await getSession();
  if (user) {
    await execute(
      `INSERT INTO audit_logs (user_id, user_email, action, entity) VALUES ($1, $2, 'logout', 'auth')`,
      [user.id, user.email]
    );
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
