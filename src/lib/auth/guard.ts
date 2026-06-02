import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth/session";

/** Use in server components / actions to require an authenticated user. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/** Require one of a set of roles, otherwise redirect to /my-work. */
export async function requireRole(roles: string[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/my-work");
  return user;
}

/** Require admin role. */
export async function requireAdmin(): Promise<SessionUser> {
  return requireRole(["admin"]);
}

/** Whether the given role is allowed to approve SOPs. */
export function canApproveSops(role: string): boolean {
  return role === "admin" || role === "business_excellence";
}

/** Whether the given role can create / edit SOPs. */
export function canEditSops(role: string): boolean {
  return ["admin", "business_excellence", "compliance"].includes(role);
}

/** Whether the given role can access /admin/*. */
export function canAccessAdmin(role: string): boolean {
  return role === "admin";
}

/** All available user roles in the system. */
export const USER_ROLES = [
  { value: "admin", label: "Administrator", desc: "Full access including user management" },
  { value: "business_excellence", label: "Business Excellence (IBE)", desc: "Approve SOPs, monitor compliance" },
  { value: "compliance", label: "Compliance team", desc: "Author and edit SOPs (no approval)" },
  { value: "auditor", label: "Auditor", desc: "Conduct audits (read-only for SOPs)" },
  { value: "branch_manager", label: "Branch Manager", desc: "Apply SOPs, fix issues" },
  { value: "viewer", label: "Viewer", desc: "Read-only access" },
] as const;
