import { redirect } from "next/navigation";

// Consolidated into /admin/config's Users tab (user spec 2026-08-17).
// Kept as a redirect so old bookmarks/links keep working.
export default async function UsersPageRedirect({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const sp = await searchParams;
  const qs = sp.search ? `&search=${encodeURIComponent(sp.search)}` : "";
  redirect(`/admin/config?tab=users${qs}`);
}
