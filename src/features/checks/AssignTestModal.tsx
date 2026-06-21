"use client";

import { useEffect, useState, useTransition } from "react";
import { assignTestAction } from "./actions";

type UserOpt = { id: number; display_name: string };
type Lookup = { id: number; name: string };
type OrgOpt = { id: number; display_label: string; level: number };

export default function AssignTestModal({
  checkId,
  checkName,
  auditors,
  departmentManagers,
  brands,
  departments,
  orgUnits,
}: {
  checkId: number;
  checkName: string;
  auditors: UserOpt[];
  departmentManagers: UserOpt[];
  brands: Lookup[];
  departments: Lookup[];
  orgUnits: OrgOpt[];
}) {
  const [open, setOpen] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [orgUnitId, setOrgUnitId] = useState("");
  // Combined value: "auditor:<id>" or "dm:<id>" so a single <select>
  // can offer both pools while keeping the role context attached.
  const [assignedValue, setAssignedValue] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  function reset() {
    setBrandId("");
    setDeptId("");
    setOrgUnitId("");
    setAssignedValue("");
    setComment("");
    setError(null);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!assignedValue) {
      setError("Pick an Auditor or Department Manager to assign to.");
      return;
    }
    if (!comment.trim()) {
      setError("Comment is required.");
      return;
    }
    setError(null);

    const [assignedRole, assignedId] = assignedValue.split(":");

    const fd = new FormData();
    fd.append("check_id", String(checkId));
    fd.append("assigned_user_id", assignedId);
    fd.append("assigned_role", assignedRole);
    if (brandId) fd.append("brand_id", brandId);
    if (deptId) fd.append("department_id", deptId);
    if (orgUnitId) fd.append("org_unit_id", orgUnitId);
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
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto animate-[slideUp_160ms_ease-out]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-test-title"
          >
            {/* Header bar with close */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2
                  id="assign-test-title"
                  className="text-xl font-bold text-gray-900"
                >
                  Assign test
                </h2>
                <p
                  className="text-sm text-gray-500 mt-0.5 truncate"
                  title={checkName}
                >
                  {checkName}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="shrink-0 w-9 h-9 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center disabled:opacity-50 text-lg"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="px-8 py-7 space-y-6">
              {/* Brand + Department side by side on md+ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Brand
                  </label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    disabled={pending}
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="">— None —</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  {brands.length === 0 && (
                    <p className="text-[11px] text-amber-700 mt-1.5">
                      No active brands yet.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Departments
                  </label>
                  <select
                    value={deptId}
                    onChange={(e) => setDeptId(e.target.value)}
                    disabled={pending}
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="">— None —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {departments.length === 0 && (
                    <p className="text-[11px] text-amber-700 mt-1.5">
                      No active departments yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Org Unit — single hierarchical dropdown (Centralised → */}
              {/* department → sub-team, or Brand-wise → brand → branch).  */}
              {/* Optional; auditor can leave as None for cross-cutting     */}
              {/* tests that don't belong to any one node.                  */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Org Unit
                </label>
                <select
                  value={orgUnitId}
                  onChange={(e) => setOrgUnitId(e.target.value)}
                  disabled={pending}
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono"
                >
                  <option value="">— None —</option>
                  {orgUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_label}
                    </option>
                  ))}
                </select>
                {orgUnits.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1.5">
                    No org units yet. Ask an admin to seed the tree at
                    /admin/org-units.
                  </p>
                )}
              </div>

              {/* Assign To — grouped (Auditor / Department Manager) */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Assign To <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignedValue}
                  onChange={(e) => setAssignedValue(e.target.value)}
                  disabled={pending}
                  required
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">— Choose someone —</option>
                  {auditors.length > 0 && (
                    <optgroup label="Auditor">
                      {auditors.map((u) => (
                        <option key={`auditor:${u.id}`} value={`auditor:${u.id}`}>
                          {u.display_name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {departmentManagers.length > 0 && (
                    <optgroup label="Department Manager">
                      {departmentManagers.map((u) => (
                        <option key={`dm:${u.id}`} value={`dm:${u.id}`}>
                          {u.display_name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  The list is grouped by role. Pick one user.
                </p>
                {auditors.length === 0 && departmentManagers.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    No active users with the Auditor or Department Manager roles yet.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={5}
                  required
                  disabled={pending}
                  placeholder="Instructions, what you need them to check, deadline expectations…"
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                />
              </div>

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-brand-700 hover:bg-brand-800 text-white px-6 py-3 rounded-xl text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2 shadow-sm"
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
