import { redirect } from "next/navigation";

// Consolidated into /admin/config's Departments tab (user spec 2026-08-17).
// Kept as a redirect so old bookmarks/links keep working.
export default function DepartmentsPageRedirect() {
  redirect("/admin/config?tab=departments");
}
