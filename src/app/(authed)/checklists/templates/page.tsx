import Link from "next/link";
import { requireUser, canEditSops } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { listTemplates } from "@/features/checklists/repository";

export default async function ChecklistTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const templates = await listTemplates(sp.search);

  return (
    <Workspace
      section="Compliance Library / Checklists"
      subtitle={`Audit checklist templates (${templates.length})`}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4 flex items-center gap-3 justify-between">
        <form method="get" className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            name="search"
            defaultValue={sp.search ?? ""}
            placeholder="Search by name, code or category…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
            Filter
          </button>
        </form>
        {canEditSops(user.role) && (
          <Link
            href="/checklists/templates/new"
            className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + New Template
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center text-gray-400 text-sm">
            No checklist templates yet. Create the first one to start auditing.
          </div>
        )}
        {templates.map((t) => (
          <Link
            key={t.id}
            href={`/checklists/templates/${t.id}`}
            className="block bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all p-6"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              {!t.is_active && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  Inactive
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{t.name}</h3>
            {t.category && (
              <div className="text-xs text-brand-700 mb-2">{t.category}</div>
            )}
            {t.description && (
              <p className="text-sm text-gray-500 line-clamp-2 mb-3">{t.description}</p>
            )}
            <div className="text-xs text-gray-400 pt-3 border-t border-gray-100 flex justify-between">
              <span>{t.item_count} items</span>
              <span>Updated {new Date(t.updated_at).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </Workspace>
  );
}
