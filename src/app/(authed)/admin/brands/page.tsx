import { redirect } from "next/navigation";

// Consolidated into /admin/config's Brands tab (user spec 2026-08-17).
// Kept as a redirect so old bookmarks/links keep working.
export default function BrandsPageRedirect() {
  redirect("/admin/config?tab=brands");
}
