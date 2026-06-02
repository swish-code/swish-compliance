import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth/session";

/** Use in server components / actions to require an authenticated user. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/** Whether the given role is allowed to approve SOPs. */
export function canApproveSops(role: string): boolean {
  return role === "admin" || role === "business_excellence";
}

/** Whether the given role can create / edit SOPs. */
export function canEditSops(role: string): boolean {
  return ["admin", "business_excellence", "compliance"].includes(role);
}
