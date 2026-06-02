import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import Placeholder from "@/features/shell/Placeholder";

export default async function Page() {
  const u = await requireUser();
  return (
    <Workspace section="Workspace" subtitle="Reports" sessionLabel="Session" userLabel={u.displayName}>
      <Placeholder name="Reports" />
    </Workspace>
  );
}
