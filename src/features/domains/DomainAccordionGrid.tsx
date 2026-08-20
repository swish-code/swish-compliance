"use client";

import Link from "next/link";
import { useState } from "react";
import DeleteEntityButton from "@/features/admin/delete/DeleteEntityButton";
import type { Domain, DomainFramework } from "./types";
import type { DomainSopRow } from "./repository";

type DomainWithDetail = Domain & {
  frameworks: DomainFramework[];
  sops: DomainSopRow[];
  departments: { id: number; name: string }[];
};

/**
 * Domains list as expand-in-place cards (user spec 2026-08-17): clicking a
 * domain no longer navigates to /domains/[id] — it expands the same card
 * to show frameworks + SOPs + departments right there. The detail route
 * still exists (bookmarks, deep links, the "Open full page" escape hatch)
 * but browsing the whole set now stays on one page.
 *
 * All per-domain data is passed in already fetched (see domains/page.tsx)
 * rather than loaded on expand — with ~50 domains and a few hundred
 * frameworks/SOPs total, prefetching everything is cheaper than the
 * latency of a fetch per click.
 */
export default function DomainAccordionGrid({
  domains,
  canEdit,
  canDelete,
}: {
  domains: DomainWithDetail[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
      {domains.map((d) => {
        const isOpen = openId === d.id;
        return (
          <div
            key={d.id}
            className={`bg-white rounded-2xl border shadow-sm transition-all ${
              isOpen
                ? "border-brand-300 ring-1 ring-brand-100 md:col-span-2 lg:col-span-3"
                : "border-gray-200 hover:shadow-md hover:border-brand-300"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : d.id)}
              aria-expanded={isOpen}
              className="w-full text-left p-6 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-700">
                    {d.name}
                  </h3>
                </div>
                <div className="shrink-0 w-12 h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm">
                  {d.framework_count}
                </div>
              </div>
              {d.description && !isOpen && (
                <p className="text-sm text-gray-600 line-clamp-3">
                  {d.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 mt-auto">
                <span>
                  {d.framework_count} framework
                  {d.framework_count === 1 ? "" : "s"}
                </span>
                <span className="text-brand-700 inline-flex items-center gap-1">
                  {isOpen ? "Collapse" : "View frameworks"}
                  <span
                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 p-6 pt-5 space-y-4">
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/domains/${d.id}`}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Open full page ↗
                  </Link>
                  {canDelete && (
                    <DeleteEntityButton
                      entityType="domain"
                      entityId={d.id}
                      label="Domain"
                    />
                  )}
                </div>

                {(d.review_scope_method ||
                  d.evidence_to_obtain ||
                  d.review_focus ||
                  d.how_to_verify) && (
                  <details className="group bg-gray-50 rounded-xl border border-gray-200">
                    <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl">
                      <span className="transition-transform group-open:rotate-90 text-gray-400">
                        ▶
                      </span>
                      How to audit this domain
                    </summary>
                    <div className="px-4 pb-4 pt-1 border-t border-gray-200 space-y-3">
                      {(
                        [
                          ["Review scope & method", d.review_scope_method],
                          ["Go to / obtain", d.evidence_to_obtain],
                          ["Review", d.review_focus],
                          ["How to verify", d.how_to_verify],
                        ] as const
                      )
                        .filter(([, value]) => value)
                        .map(([label, value]) => (
                          <div key={label}>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold mb-1">
                              {label}
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                              {value}
                            </p>
                          </div>
                        ))}
                    </div>
                  </details>
                )}

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700">
                      Frameworks ({d.frameworks.length})
                    </h4>
                    {canEdit && (
                      <Link
                        href={`/frameworks/new?domain=${d.id}`}
                        className="text-xs text-brand-700 hover:underline"
                      >
                        + New Framework
                      </Link>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Name</th>
                        <th className="text-left px-4 py-2 font-medium w-28">Category</th>
                        <th className="text-left px-4 py-2 font-medium w-20">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.frameworks.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">
                            No frameworks linked to this domain yet.
                          </td>
                        </tr>
                      )}
                      {d.frameworks.map((fw) => (
                        <tr
                          key={fw.id}
                          className={`border-t border-gray-100 hover:bg-gray-50 ${
                            fw.is_active ? "" : "opacity-60"
                          }`}
                        >
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/frameworks/${fw.id}`}
                              className="font-medium text-brand-700 hover:underline"
                            >
                              {fw.name}
                            </Link>
                            {fw.description && (
                              <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {fw.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-600">
                            {fw.category ?? "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            {fw.is_active ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                Inactive
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* items-start: without it, CSS grid stretches both cells
                    to match the taller one, so opening the SOPs <details>
                    visually drags Departments open too even though it's
                    still collapsed. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  <details className="group bg-white rounded-xl border border-gray-200">
                    <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      <span className="transition-transform group-open:rotate-90 text-gray-400">▶</span>
                      SOPs ({d.sops.length})
                    </summary>
                    <ul className="border-t border-gray-100 divide-y divide-gray-100">
                      {d.sops.length === 0 && (
                        <li className="px-4 py-3 text-xs text-gray-400">No linked SOPs.</li>
                      )}
                      {d.sops.map((s) => (
                        <li key={s.id} className="px-4 py-2 text-sm">
                          <Link href={`/sops/${s.id}`} className="text-brand-700 hover:underline">
                            {s.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                  <details className="group bg-white rounded-xl border border-gray-200">
                    <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      <span className="transition-transform group-open:rotate-90 text-gray-400">▶</span>
                      Departments ({d.departments.length})
                    </summary>
                    <ul className="border-t border-gray-100 divide-y divide-gray-100">
                      {d.departments.length === 0 && (
                        <li className="px-4 py-3 text-xs text-gray-400">No linked departments.</li>
                      )}
                      {d.departments.map((dep) => (
                        <li key={dep.id} className="px-4 py-2 text-sm text-gray-800">
                          {dep.name}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
