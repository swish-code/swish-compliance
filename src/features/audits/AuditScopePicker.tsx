"use client";

import { useMemo, useState } from "react";

type Domain = { id: number; code: string; name: string };
type Framework = { id: number; code: string; name: string; domain_id: number | null };
type Control = {
  id: number;
  code: string | null;
  name: string;
  framework_id: number | null;
};
type Test = {
  id: number;
  code: string | null;
  name: string;
  control_id: number | null;
};

export default function AuditScopePicker({
  domains,
  frameworks,
  controls,
  tests,
}: {
  domains: Domain[];
  frameworks: Framework[];
  controls: Control[];
  tests: Test[];
}) {
  const [domainId, setDomainId] = useState("");
  const [frameworkId, setFrameworkId] = useState("");
  const [controlId, setControlId] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([]);

  // Index lookups so each cascading filter is O(1) rather than re-scanning.
  const frameworksByDomain = useMemo(() => {
    const m = new Map<string, Framework[]>();
    for (const f of frameworks) {
      if (f.domain_id == null) continue;
      const k = String(f.domain_id);
      (m.get(k) ?? m.set(k, []).get(k)!).push(f);
    }
    return m;
  }, [frameworks]);

  const controlsByFramework = useMemo(() => {
    const m = new Map<string, Control[]>();
    for (const c of controls) {
      if (c.framework_id == null) continue;
      const k = String(c.framework_id);
      (m.get(k) ?? m.set(k, []).get(k)!).push(c);
    }
    return m;
  }, [controls]);

  const testsByControl = useMemo(() => {
    const m = new Map<string, Test[]>();
    for (const t of tests) {
      if (t.control_id == null) continue;
      const k = String(t.control_id);
      (m.get(k) ?? m.set(k, []).get(k)!).push(t);
    }
    return m;
  }, [tests]);

  const availableFrameworks = domainId
    ? frameworksByDomain.get(domainId) ?? []
    : [];
  const availableControls = frameworkId
    ? controlsByFramework.get(frameworkId) ?? []
    : [];
  const availableTests = controlId
    ? testsByControl.get(controlId) ?? []
    : [];

  function toggleTest(id: number) {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllTests() {
    setSelectedTestIds(availableTests.map((t) => t.id));
  }
  function clearTests() {
    setSelectedTestIds([]);
  }

  return (
    <div className="border-t border-gray-100 pt-5 space-y-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Audit scope <span className="text-red-500 normal-case">*</span>
      </div>

      {/* Hidden inputs so the parent <form> picks the values up on submit. */}
      <input type="hidden" name="domain_id" value={domainId} />
      <input type="hidden" name="framework_id" value={frameworkId} />
      <input type="hidden" name="control_id" value={controlId} />
      {selectedTestIds.map((id) => (
        <input key={id} type="hidden" name="test_ids" value={id} />
      ))}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1) Domain */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Domain <span className="text-red-500">*</span>
          </label>
          <select
            value={domainId}
            onChange={(e) => {
              setDomainId(e.target.value);
              // Reset everything below so stale selections can't be submitted.
              setFrameworkId("");
              setControlId("");
              setSelectedTestIds([]);
            }}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">— Choose a domain —</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} · {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2) Framework */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Framework <span className="text-red-500">*</span>
          </label>
          <select
            value={frameworkId}
            onChange={(e) => {
              setFrameworkId(e.target.value);
              setControlId("");
              setSelectedTestIds([]);
            }}
            disabled={!domainId}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">
              {!domainId
                ? "— Pick a domain first —"
                : availableFrameworks.length === 0
                ? "— No frameworks under this domain —"
                : "— Choose a framework —"}
            </option>
            {availableFrameworks.map((f) => (
              <option key={f.id} value={f.id}>
                {f.code} · {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3) Control */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Control <span className="text-red-500">*</span>
          </label>
          <select
            value={controlId}
            onChange={(e) => {
              setControlId(e.target.value);
              setSelectedTestIds([]);
            }}
            disabled={!frameworkId}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">
              {!frameworkId
                ? "— Pick a framework first —"
                : availableControls.length === 0
                ? "— No controls under this framework —"
                : "— Choose a control —"}
            </option>
            {availableControls.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code} · ` : ""}
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4) Tests — multi-select via checkboxes. A native <select multiple>
          gets the job done but the UX is fiddly (ctrl-click on desktop,
          unusable on touch); a checkbox column is just better for the
          handful of tests that sit under a single control. */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium text-gray-600">
            Tests <span className="text-red-500">*</span>
            <span className="ml-1 text-gray-400 font-normal">
              ({selectedTestIds.length} selected)
            </span>
          </label>
          {availableTests.length > 0 && (
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={selectAllTests}
                className="text-brand-700 hover:underline"
              >
                Select all
              </button>
              <span className="text-gray-300">·</span>
              <button
                type="button"
                onClick={clearTests}
                className="text-gray-500 hover:underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <div
          className={`border border-gray-300 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100 ${
            !controlId ? "bg-gray-50" : "bg-white"
          }`}
        >
          {!controlId && (
            <div className="px-3 py-6 text-sm text-gray-400 text-center">
              Pick a control first to see the tests below it.
            </div>
          )}
          {controlId && availableTests.length === 0 && (
            <div className="px-3 py-6 text-sm text-gray-400 text-center">
              No tests are linked to this control yet.
            </div>
          )}
          {availableTests.map((t) => {
            const checked = selectedTestIds.includes(t.id);
            return (
              <label
                key={t.id}
                className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${
                  checked ? "bg-brand-50/40" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleTest(t.id)}
                  className="mt-0.5 accent-brand-700"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-900">
                    {t.code && (
                      <span className="font-mono text-xs text-gray-500 mr-2">
                        {t.code}
                      </span>
                    )}
                    {t.name}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        {controlId && availableTests.length > 0 && selectedTestIds.length === 0 && (
          <p className="text-[11px] text-amber-700 mt-1.5">
            Pick at least one test before starting the audit.
          </p>
        )}
      </div>
    </div>
  );
}
