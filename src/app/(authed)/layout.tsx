import { requireUser } from "@/lib/auth/guard";
import Sidebar from "@/features/shell/Sidebar";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <>
      <Sidebar displayName={user.displayName} />
      {children}
    </>
  );
}
