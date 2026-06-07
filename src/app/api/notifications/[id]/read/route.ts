import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { markRead } from "@/features/notifications/repository";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await markRead(Number(id), user.id);
  return NextResponse.json({ ok: true });
}
