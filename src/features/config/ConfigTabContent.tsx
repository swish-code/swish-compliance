import Link from "next/link";
import { CONFIG_KINDS } from "./types";
import { listOptions } from "./repository";
import {
  createOptionAction,
  renameOptionAction,
  toggleOptionAction,
  deleteOptionAction,
  moveOptionAction,
} from "./actions";

/** Config tab body (dropdown options) — was the whole /admin/config page
 *  before the admin pages were consolidated into a single tabbed page
 *  (user spec 2026-08-17). LockedSection's "managed at" links now point
 *  at sibling tabs on the same page rather than separate routes. */
export default async function ConfigTabContent() {
  const editableKinds = CONFIG_KINDS.filter((k) => k.editable);
  const optionsByKind = Object.fromEntries(
    await Promise.all(
      editableKinds.map(async (k) => [k.key, await listOptions(k.key, false)] as const)
    )
  );

  return (
    <div className="space-y-6">
      {CONFIG_KINDS.map((k) =>
        k.editable ? (
          <EditableSection key={k.key} kind={k} options={optionsByKind[k.key] ?? []} />
        ) : (
          <LockedSection key={k.key} kind={k} />
        )
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Editable section                                                    */
/* ------------------------------------------------------------------ */

function EditableSection({
  kind,
  options,
}: {
  kind: (typeof CONFIG_KINDS)[number];
  options: Awaited<ReturnType<typeof listOptions>>;
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <Header kind={kind} />

      {/* Where it shows up */}
      <UsedOn pages={kind.usedOn} />

      {/* Add new */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <form action={createOptionAction} className="flex items-center gap-2">
          <input type="hidden" name="kind" value={kind.key} />
          <input
            type="text"
            name="label"
            required
            placeholder="New option label…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          >
            + Add
          </button>
        </form>
      </div>

      {/* Options list */}
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left px-5 py-2 font-medium w-12">#</th>
            <th className="text-left px-5 py-2 font-medium">Label (visible to users)</th>
            <th className="text-left px-5 py-2 font-medium w-40">Value (internal)</th>
            <th className="text-left px-5 py-2 font-medium w-28">Status</th>
            <th className="text-right px-5 py-2 font-medium w-40">Actions</th>
          </tr>
        </thead>
        <tbody>
          {options.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-6 text-center text-gray-400 text-sm">
                No options yet — add the first one above.
              </td>
            </tr>
          )}
          {options.map((opt) => (
            <tr key={opt.id} className="border-t border-gray-100">
              <td className="px-5 py-2 text-xs text-gray-400 font-mono">{opt.sort_order}</td>
              <td className="px-5 py-2">
                <form action={renameOptionAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={opt.id} />
                  <input
                    type="text"
                    name="label"
                    defaultValue={opt.label}
                    className="px-2 py-1 border border-transparent hover:border-gray-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 rounded text-sm w-full"
                  />
                  <button type="submit" className="text-xs text-brand-700 hover:underline whitespace-nowrap">
                    Save
                  </button>
                </form>
              </td>
              <td className="px-5 py-2 text-xs font-mono text-gray-500">{opt.value}</td>
              <td className="px-5 py-2">
                {opt.is_active ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Hidden
                  </span>
                )}
              </td>
              <td className="px-5 py-2 text-right">
                <div className="inline-flex items-center gap-1.5">
                  <form action={moveOptionAction}>
                    <input type="hidden" name="id" value={opt.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button type="submit" title="Move up" className="text-xs px-1.5 py-0.5 text-gray-500 hover:bg-gray-100 rounded">▲</button>
                  </form>
                  <form action={moveOptionAction}>
                    <input type="hidden" name="id" value={opt.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button type="submit" title="Move down" className="text-xs px-1.5 py-0.5 text-gray-500 hover:bg-gray-100 rounded">▼</button>
                  </form>
                  <form action={toggleOptionAction}>
                    <input type="hidden" name="id" value={opt.id} />
                    <input type="hidden" name="active" value={opt.is_active ? "" : "on"} />
                    <button
                      type="submit"
                      className={`text-xs px-2 py-0.5 rounded border ${
                        opt.is_active
                          ? "border-gray-300 text-gray-600 hover:bg-gray-50"
                          : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {opt.is_active ? "Hide" : "Show"}
                    </button>
                  </form>
                  <form action={deleteOptionAction}>
                    <input type="hidden" name="id" value={opt.id} />
                    <button type="submit" className="text-xs px-2 py-0.5 rounded border border-red-200 text-red-600 hover:bg-red-50">
                      Delete
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Locked section (informational)                                      */
/* ------------------------------------------------------------------ */

function LockedSection({ kind }: { kind: (typeof CONFIG_KINDS)[number] }) {
  return (
    <section className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
      <Header kind={kind} locked />
      <UsedOn pages={kind.usedOn} />
      <div className="px-5 py-4">
        {kind.note && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            🔒 {kind.note}
          </div>
        )}
        {kind.managedAt && (
          <Link
            href={kind.managedAt}
            className="inline-block text-sm bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg"
          >
            Go to {kind.managedAtLabel ?? kind.managedAt} →
          </Link>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function Header({
  kind,
  locked = false,
}: {
  kind: (typeof CONFIG_KINDS)[number];
  locked?: boolean;
}) {
  return (
    <div className="px-5 py-4 border-b border-gray-100">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-base font-semibold text-gray-900">{kind.title}</h2>
        {locked && (
          <span className="text-[10px] uppercase tracking-widest bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
            Locked
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500">{kind.description}</p>
    </div>
  );
}

function UsedOn({ pages }: { pages: string[] }) {
  return (
    <div className="px-5 py-3 bg-brand-50/40 border-b border-brand-100/40">
      <div className="text-[10px] uppercase tracking-widest text-brand-700 font-semibold mb-1.5">
        Where this shows up
      </div>
      <ul className="text-xs text-gray-700 space-y-0.5">
        {pages.map((p, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-brand-500">→</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
