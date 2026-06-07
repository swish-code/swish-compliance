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

// ---------------------------------------------------------------------------
// SOP workflow v2 helpers (4-stage approval)
//   Department Manager → Compliance → Business Excellence → CEO
// ---------------------------------------------------------------------------

/** Who can create a new SOP. */
export function canCreateSops(role: string): boolean {
  return role === "department_manager" || role === "admin";
}

/** First-stage reviewer: Compliance team. */
export function canReviewAtCompliance(role: string): boolean {
  return role === "compliance" || role === "admin";
}

/** Second-stage reviewer: Business Excellence. */
export function canReviewAtBE(role: string): boolean {
  return role === "business_excellence" || role === "admin";
}

/** Final-stage reviewer: CEO. */
export function canReviewAtCEO(role: string): boolean {
  return role === "ceo" || role === "admin";
}

// ---------------------------------------------------------------------------
// Legacy helpers kept for non-SOP modules (CAPA verification, etc.)
// ---------------------------------------------------------------------------

/** Whether the given role is allowed to approve / verify CAPAs. */
export function canApproveSops(role: string): boolean {
  return role === "admin" || role === "business_excellence";
}

/** Whether the role can create / edit checklists, controls, checks, etc. */
export function canEditSops(role: string): boolean {
  return ["admin", "business_excellence", "compliance"].includes(role);
}

/** Whether the given role can access /admin/*. */
export function canAccessAdmin(role: string): boolean {
  return role === "admin";
}

/** All available user roles in the system. */
export const USER_ROLES = [
  { value: "admin",                label: "Administrator",         desc: "Full access including user management and system configuration" },
  { value: "ceo",                  label: "CEO",                   desc: "Final approval authority on SOPs after Business Excellence" },
  { value: "business_excellence",  label: "Business Excellence (IBE)", desc: "Second-stage SOP review and CAPA verification" },
  { value: "compliance",           label: "Compliance team",       desc: "First-stage SOP review; authors checklists, controls and checks" },
  { value: "department_manager",   label: "Department Manager",    desc: "Authors SOPs for their department and handles assigned CAPAs" },
  { value: "auditor",              label: "Auditor",               desc: "Conducts on-site audits and records test results" },
  { value: "viewer",               label: "Viewer",                desc: "Read-only access to reports and current data" },
] as const;
