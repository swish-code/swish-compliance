"use client";

import { useEffect, useState, useTransition } from "react";
import { assignTestAction } from "./actions";

type UserOpt = { id: number; display_name: string };

export default function AssignTestModal({
  checkId,
  checkName,
  auditors,
  departmentManagers,
}: {
  checkId: number;
  checkName: string;
  auditors: UserOpt[];
  departmentManagers: UserOpt[];
}) {
  const [open, setOpen] = useState(false);
  const [auditorId, setAuditorId] = useState("");
  const [dmId, setDmId] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  function reset() {
    setAuditorId("");
    setDmId("");
    setComment("");
    setError(null);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auditorId && !dmId) {
      setError("Pick at least one assignee (Auditor or Department Manager).");
      return;
    }
    if (!comment.trim()) {
      setError("Comment is required.");
      return;
    }
    setError(null);

    const fd = new FormData();
    fd.append("check_id", String(checkId));
    if (auditorId) fd.append("auditor_user_id", auditorId);
    if (dmId) fd.append("dm_user_id", dmId);
    fd.append("comment", comment.trim());

    startTransition(async () => {
      try {
        await assignTestAction(fd);
        reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Assignment failed.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 hover:border-brand-300 transition-colors"
        title={`Assign "${checkName}" to an Auditor or Department Manager`}
      >
        📋 Assign
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_120ms_ease-out]"
          onClick={close}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-[slideUp_160ms_ease-out]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-test-title"
          >
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="absolute top-3 right-3 w-8 h-8 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center disabled:opacity-50"
              aria-label="Close"
            >
              ✕
            </button>

            <h2
              id="assign-test-title"
              className="text-base font-semibold text-gray-900 mb-1 pr-8"
            >
              Assign test
            </h2>
            <p className="text-xs text-gray-500 mb-5 truncate" title={checkName}>
              {checkName}
            </p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Auditor
                </label>
                <select
                  value={auditorId}
                  onChange={(e) => setAuditorId(e.target.value)}
                  disabled={pending}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— None —</option>
                  {auditors.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name}
                    </option>
                  ))}
                </select>
                {auditors.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    No users with the Auditor role yet.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Department Manager
                </label>
                <select
                  value={dmId}
                  onChange={(e) => setDmId(e.target.value)}
                  disabled={pending}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— None —</option>
                  {departmentManagers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name}
                    </option>
                  ))}
                </select>
                {departmentManagers.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    No users with the Department Manager role yet.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  required
                  disabled={pending}
                  placeholder="Instructions, what you need them to check, deadline expectations…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              {error && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {pending ? (
                    <>
                      <span className="w-3 h-3 rounded-full bg-white/70 animate-pulse" />
                      Sending…
                    </>
                  ) : (
                    "Send assignment"
                  )}
                </button>
              </div>
            </form>
          </div>

          <style>{`
            @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(8px) }
              to   { opacity: 1; transform: translateY(0) }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
