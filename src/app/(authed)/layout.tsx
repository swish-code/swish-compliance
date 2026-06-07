import { Suspense } from "react";
import { requireUser } from "@/lib/auth/guard";
import Sidebar from "@/features/shell/Sidebar";
import NavigationProgress from "@/features/shell/NavigationProgress";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Sidebar displayName={user.displayName} role={user.role} />
      {children}
    </>
  );
}
