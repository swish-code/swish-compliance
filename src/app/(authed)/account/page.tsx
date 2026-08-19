import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import ChangePasswordForm from "@/features/account/ChangePasswordForm";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <Workspace
      section="My Account"
      subtitle="Account settings"
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-lg">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1">
          Change password
        </h3>
        <p className="text-xs text-gray-500 mb-5">
          Signed in as {user.email}
        </p>
        <ChangePasswordForm />
      </div>
    </Workspace>
  );
}
