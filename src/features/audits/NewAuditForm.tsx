"use client";

import Link from "next/link";
import { useState } from "react";
import AuditScopePicker from "./AuditScopePicker";
import type { ScopeGraph } from "./scope";

type Option = { id: number; name: string };
type DepartmentOption = {
  id: number;
  name: string;
  manager_id: number | null;
  manager_name: string | null;
};
type UserOption = { id: number; display_name: string; role: string };
type Policy = {
  id: number;
  code: string | null;
  title: string;
  department_id: number | null;
};

/**
 * The audited department is owned here rather than inside the scope
 * picker: it belongs to "Audit ownership" in the UI, but the scope walk
 * is department-limited, so both sections need to read the same value.
 */
export default function NewAuditForm({
  action,
  departments,
  users,
  reviewerUsers,
  brands,
  policies,
  graph,
  today,
}: {
  action: (formData: FormData) => void | Promise<void>;
  departments: DepartmentOption[];
  users: UserOption[];
  reviewerUsers: UserOption[];
  brands: Option[];
  policies: Policy[];
  graph: ScopeGraph;
  /** Rendered on the server so SSR and hydration agree on "today". */
  today: string;
}) {
  const [departmentId, setDepartmentId] = useState("");
  // Department Representative / Auditee (user spec 2026-08-19): defaults
  // to the audited department's manager and stays that way unless the
  // auditor opts to type a custom name instead — e.g. no manager is set
  // yet, or a different person will actually represent the department
  // for this audit.
  const [useCustomAuditee, setUseCustomAuditee] = useState(false);
  const [customAuditeeName, setCustomAuditeeName] = useState("");

  const selectedDepartment = departments.find((d) => String(d.id) === departmentId);

  const fieldClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1.5";

  function renderUserOptions(list: UserOption[]) {
    const byRole = Array.from(
      list.reduce((acc, u) => {
        const k = u.role || "other";
        const arr = acc.get(k) ?? acc.set(k, []).get(k)!;
        arr.push(u);
        return acc;
      }, new Map<string, UserOption[]>())
    );
    return byRole.map(([role, group]) => (
      <optgroup
        key={role}
        label={role
          .split("_")
          .map((w) => w[0]?.toUpperCase() + w.slice(1))
          .join(" ")}
      >
        {group.map((u) => (
          <option key={u.id} value={u.id}>
            {u.display_name}
          </option>
        ))}
      </optgroup>
    ));
  }

  const userOptions = renderUserOptions(users);
  const reviewerOptions = renderUserOptions(reviewerUsers);

  return (
    <form action={action} className="space-y-6">
      {/* ── 1. Audit ownership ──────────────────────────────────────────── */}
      <section className="border border-gray-200 rounded-xl overflow-hidden">
        <h2 className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700">
          <span className="text-gray-400 mr-1.5">1.</span> Audit ownership
        </h2>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass} htmlFor="department_id">
                Audited Department <span className="text-red-500">*</span>
              </label>
              <select
                id="department_id"
                name="department_id"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
                className={fieldClass}
              >
                <option value="">— Choose a department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="assigned_to">
                Assigned Auditor <span className="text-red-500">*</span>
              </label>
              <select
                id="assigned_to"
                name="assigned_to"
                required
                className={fieldClass}
              >
                <option value="">— Choose an auditor —</option>
                {userOptions}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="auditee_display">
                Department Representative / Auditee
              </label>
              {useCustomAuditee ? (
                <input
                  id="auditee_custom_name"
                  name="auditee_custom_name"
                  value={customAuditeeName}
                  onChange={(e) => setCustomAuditeeName(e.target.value)}
                  placeholder="Type a name…"
                  className={fieldClass}
                />
              ) : (
                <input
                  id="auditee_display"
                  disabled
                  value={
                    selectedDepartment?.manager_name ??
                    (departmentId ? "No manager set for this department" : "— Choose a department first —")
                  }
                  className={fieldClass}
                />
              )}
              {/* Submits the department's manager as the auditee unless a
                  custom name is being used instead. */}
              <input
                type="hidden"
                name="auditee_id"
                value={useCustomAuditee ? "" : selectedDepartment?.manager_id ?? ""}
              />
              <button
                type="button"
                onClick={() => {
                  setUseCustomAuditee((v) => !v);
                  setCustomAuditeeName("");
                }}
                className="text-[11px] text-brand-700 hover:underline mt-1"
              >
                {useCustomAuditee ? "Use department manager instead" : "Use a custom name instead"}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-400">
            The assigned auditor will conduct the audit. The department
            representative will provide evidence and respond to results —
            it defaults to the department&apos;s manager, or type a name.
          </p>
        </div>
      </section>

      {/* ── 2. Audit scope ──────────────────────────────────────────────── */}
      <section className="border border-gray-200 rounded-xl overflow-hidden">
        <h2 className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700">
          <span className="text-gray-400 mr-1.5">2.</span> Audit scope
        </h2>
        <div className="p-4 space-y-4">
          <AuditScopePicker
            policies={policies}
            graph={graph}
            departmentId={departmentId}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass} htmlFor="brand_id">
                Brand
              </label>
              <select id="brand_id" name="brand_id" className={fieldClass}>
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="location">
                Location
              </label>
              <input
                id="location"
                name="location"
                placeholder="e.g. Head Office"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="audit_date">
                Audit Date <span className="text-red-500">*</span>
              </label>
              <input
                id="audit_date"
                type="date"
                name="audit_date"
                defaultValue={today}
                required
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="start_at">
                Start Date &amp; Time <span className="text-red-500">*</span>
              </label>
              <input
                id="start_at"
                type="datetime-local"
                name="start_at"
                required
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="end_at">
                Due Date &amp; Time <span className="text-red-500">*</span>
              </label>
              <input
                id="end_at"
                type="datetime-local"
                name="end_at"
                required
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="reviewer_id">
                Reviewer / Approver{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select id="reviewer_id" name="reviewer_id" className={fieldClass}>
                <option value="">— None —</option>
                {reviewerOptions}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="objective">
                Audit Objective{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="objective"
                name="objective"
                rows={2}
                placeholder="What this audit sets out to verify…"
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="notes">
              Notes{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="notes"
              name="notes"
              placeholder="Add any additional notes or instructions for the audit…"
              className={fieldClass}
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="bg-brand-700 hover:bg-brand-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
        >
          Start audit
        </button>
        <Link
          href="/audits"
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2.5"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
