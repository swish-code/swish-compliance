"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getDeleteImpactAction,
  deleteEntityAction,
} from "./actions";
import type { EntityType, DeleteImpact } from "@/lib/admin/deleteEntity";

/**
 * Admin "Delete" button, shared by every entity detail page (SOP, Domain,
 * Framework, Control, Checklist template, Audit, CAPA). Only rendered by
 * the caller when canDeleteOrArchive(role) is true — this component
 * doesn't re-check permissions visually, but the server actions it calls
 * do, so a stale render can't bypass the gate.
 *
 * Two-step: open the dialog (fetches the impact preview), then confirm.
 * The preview always runs before the button is even enabled, so nobody
 * can click through a delete without seeing what else it touches.
 */
export default function DeleteEntityButton({
  entityType,
  entityId,
  label,
}: {
  entityType: EntityType;
  entityId: number;
  /** e.g. "SOP" — used in button text and the dialog title. */
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<DeleteImpact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingImpact, startLoadImpact] = useTransition();
  const [deleting, startDelete] = useTransition();

  function openDialog() {
    setOpen(true);
    setError(null);
    setImpact(null);
    startLoadImpact(async () => {
      const result = await getDeleteImpactAction(entityType, entityId);
      if (!result.allowed) {
        setError("You don't have permission to delete this.");
        return;
      }
      setImpact(result);
    });
  }

  function confirmDelete() {
    startDelete(async () => {
      const result = await deleteEntityAction(entityType, entityId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push(result.redirectTo);
      router.refresh();
    });
  }

  const cascaded = impact?.rows.filter((r) => r.cascaded) ?? [];
  const orphaned = impact?.rows.filter((r) => !r.cascaded) ?? [];
  const blocked = !!impact?.blockedReason;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg border border-red-200 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7h14z"
          />
        </svg>
        Delete
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Delete this {label.toLowerCase()}?
            </h2>

            {loadingImpact && (
              <p className="text-sm text-gray-500 mt-3">Checking what's linked…</p>
            )}

            {!loadingImpact && impact?.exists === false && (
              <p className="text-sm text-gray-500 mt-3">
                This record no longer exists — it may already be deleted.
              </p>
            )}

            {!loadingImpact && impact?.exists && (
              <>
                <p className="text-sm text-gray-600 mt-1 mb-3">
                  <span className="font-medium text-gray-900">{impact.title}</span>
                </p>

                {blocked && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800 mb-3">
                    Can't delete: {impact.blockedReason}
                  </div>
                )}

                {cascaded.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[11px] font-semibold text-red-700 uppercase tracking-wide mb-1.5">
                      Will be permanently deleted too
                    </div>
                    <ul className="text-xs text-gray-700 space-y-1">
                      {cascaded.map((r) => (
                        <li key={r.label} className="flex justify-between gap-3">
                          <span>{r.label}</span>
                          <span className="font-mono text-gray-500 shrink-0">{r.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {orphaned.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Will be unlinked, kept
                    </div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {orphaned.map((r) => (
                        <li key={r.label} className="flex justify-between gap-3">
                          <span>{r.label}</span>
                          <span className="font-mono text-gray-400 shrink-0">{r.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {cascaded.length === 0 && orphaned.length === 0 && !blocked && (
                  <p className="text-xs text-gray-500 mb-3">
                    Nothing else references this record.
                  </p>
                )}

                {!blocked && (
                  <p className="text-[11px] text-gray-400 mb-4">
                    A snapshot is kept in the database and can be recovered by an
                    administrator. This action itself cannot be undone from the UI.
                  </p>
                )}
              </>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={loadingImpact || deleting || blocked || impact?.exists === false}
                className="text-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium"
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
