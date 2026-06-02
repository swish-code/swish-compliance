import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, createSession } from "@/lib/auth/session";
import { execute } from "@/lib/db";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  await createSession(user);

  await execute(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, details)
     VALUES ($1, $2, 'login', 'auth', $3)`,
    [user.id, user.email, JSON.stringify({ role: user.role })]
  );

  return NextResponse.json({ ok: true, user });
}
