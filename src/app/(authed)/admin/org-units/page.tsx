import { redirect } from "next/navigation";

// Consolidated into /admin/config's Org Units tab (user spec 2026-08-17).
// Kept as a redirect so old bookmarks/links keep working.
export default function OrgUnitsPageRedirect() {
  redirect("/admin/config?tab=org-units");
}
