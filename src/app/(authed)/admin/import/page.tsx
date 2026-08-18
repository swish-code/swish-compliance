import { requireAdmin } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import ImportWorkbookForm from "@/features/admin/import/ImportWorkbookForm";

export default async function ImportDataPage() {
  const me = await requireAdmin();

  return (
    <Workspace
      section="Administration / Import Data"
      subtitle="Import a SOP_GRC workbook"
      sessionLabel="Session"
      userLabel={me.displayName}
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-3xl space-y-6">
        <div>
          <p className="text-sm text-gray-600">
            Upload a filled-in SOP_GRC_Department_Branch template and the
            system adds every SOP, Domain, Framework, Control, Test,
            Checklist and Question in it — linking each one into the
            existing compliance tree by code and department, the same way
            Domain → Framework → Control → Test → Checklist → Question
            already works everywhere else in the app.
          </p>
          <ul className="text-xs text-gray-500 mt-3 space-y-1 list-disc list-inside">
            <li>
              Departments named in the file must already exist under{" "}
              <span className="font-medium">Administration → Departments</span>{" "}
              — the import resolves them by name and stops if one isn&apos;t found,
              rather than creating a duplicate.
            </li>
            <li>
              Nothing is ever deleted or overwritten by omission — every row
              upserts on its own code, so re-uploading the same file (or a
              file that only adds new SOPs) is always safe to run again.
            </li>
            <li>
              Run with <span className="font-medium">Preview only</span>{" "}
              first — it shows exactly what would be created before anything
              is saved.
            </li>
          </ul>
        </div>

        <ImportWorkbookForm />
      </div>
    </Workspace>
  );
}
