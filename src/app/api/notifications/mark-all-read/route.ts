import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { markAllRead } from "@/features/notifications/repository";

export async function POST() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await markAllRead(user.id);
  return NextResponse.json({ ok: true });
}
