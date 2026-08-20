"use client";

import { useMemo, useState } from "react";
import type {
  ScopeGraph,
  ScopeGraphFramework,
  ScopeType,
} from "./scope";

type Policy = {
  id: number;
  code: string | null;
  title: string;
  department_id: number | null;
};

const SCOPE_TYPE_LABEL: Record<ScopeType, string> = {
  full_sop: "Full SOP Audit",
  framework: "Framework Audit",
  domain: "Domain Audit",
};

const SCOPE_TYPE_HINT: Record<ScopeType, string> = {
  full_sop:
    "Audits the entire SOP for the selected department — every domain, framework, control and test under it.",
  framework:
    "Audits a single framework inside the SOP. This is the usual choice.",
  domain:
    "Audits every framework under one domain. Broad — prefer a Framework Audit unless you really need the whole domain.",
};

/**
 * SOP-first scope picker.
 *
 * The auditor picks Policy → Scope Type → (Domain / Framework) and the
 * component shows exactly what that pulls in. Controls, tests, checklists
 * and questions are never selected by hand — they are derived, and the
 * server re-derives them on submit so this preview can only ever be
 * informational.
 */
export default function AuditScopePicker({
  policies,
  graph,
  departmentId,
}: {
  policies: Policy[];
  graph: ScopeGraph;
  /** The audited department, owned by the parent form. Scoping is always
   *  department-limited: one SOP can span several departments and each is
   *  audited separately. */
  departmentId: string;
}) {
  const [policyId, setPolicyId] = useState("");
  const [scopeType, setScopeType] = useState<ScopeType>("framework");
  const [domainId, setDomainId] = useState("");
  const [frameworkId, setFrameworkId] = useState("");

  const sopNum = Number(policyId) || null;
  const deptNum = Number(departmentId) || null;

  // Only offer policies that actually have auditable content for this
  // department. Deliberately NOT filtered on sops.department_id: a SOP is
  // filed under its owning department but can govern domains elsewhere —
  // CC-SOP-004 is owned by Customer Care yet its refund domain belongs to
  // Complaints Operations, and that pairing is a legitimate audit.
  const availablePolicies = useMemo(() => {
    if (!deptNum) return [];
    const sopIdsWithContent = new Set(
      graph.domains
        .filter((d) => d.department_id === deptNum && d.sop_id != null)
        .map((d) => d.sop_id as number)
    );
    for (const f of graph.frameworks) {
      if (f.department_id === deptNum && f.sop_id != null) {
        sopIdsWithContent.add(f.sop_id);
      }
    }
    return policies.filter((p) => sopIdsWithContent.has(p.id));
  }, [policies, graph.domains, graph.frameworks, deptNum]);

  // Domains belonging to this SOP *and* the audited department.
  const availableDomains = useMemo(() => {
    if (!sopNum || !deptNum) return [];
    return graph.domains.filter(
      (d) => d.sop_id === sopNum && d.department_id === deptNum
    );
  }, [graph.domains, sopNum, deptNum]);

  // A framework qualifies through its own SOP/department, or inherits them
  // from its parent domain — mirrors the COALESCE in resolveScope().
  const frameworkMatches = useMemo(() => {
    const domainById = new Map(graph.domains.map((d) => [d.id, d]));
    return (f: ScopeGraphFramework) => {
      const parent = f.domain_id != null ? domainById.get(f.domain_id) : undefined;
      const sop = f.sop_id ?? parent?.sop_id ?? null;
      const dept = f.department_id ?? parent?.department_id ?? null;
      return sop === sopNum && dept === deptNum;
    };
  }, [graph.domains, sopNum, deptNum]);

  const availableFrameworks = useMemo(() => {
    if (!sopNum || !deptNum) return [];
    const inScope = graph.frameworks.filter(frameworkMatches);
    // In domain mode the framework list narrows to the chosen domain.
    if (scopeType === "domain" && domainId) {
      return inScope.filter((f) => String(f.domain_id) === domainId);
    }
    return inScope;
  }, [graph.frameworks, frameworkMatches, sopNum, deptNum, scopeType, domainId]);

  // The domain shown alongside a chosen framework — read-only context, so
  // the auditor can see where the framework sits without picking it twice.
  const derivedDomain = useMemo(() => {
    if (scopeType === "domain") {
      return graph.domains.find((d) => String(d.id) === domainId) ?? null;
    }
    if (scopeType === "framework" && frameworkId) {
      const f = graph.frameworks.find((x) => String(x.id) === frameworkId);
      if (!f?.domain_id) return null;
      return graph.domains.find((d) => d.id === f.domain_id) ?? null;
    }
    return null;
  }, [scopeType, domainId, frameworkId, graph.domains, graph.frameworks]);

  // ── Live preview — the same walk resolveScope() does, in memory ────────
  const preview = useMemo(() => {
    let frameworks: ScopeGraphFramework[] = [];
    if (!sopNum || !deptNum) {
      frameworks = [];
    } else if (scopeType === "framework") {
      frameworks = frameworkId
        ? graph.frameworks.filter((f) => String(f.id) === frameworkId)
        : [];
    } else if (scopeType === "domain") {
      frameworks = domainId
        ? graph.frameworks.filter(
            (f) => String(f.domain_id) === domainId && frameworkMatches(f)
          )
        : [];
    } else {
      frameworks = graph.frameworks.filter(frameworkMatches);
    }

    const fwIds = new Set(frameworks.map((f) => f.id));
    const controls = graph.controls.filter(
      (c) => c.framework_id != null && fwIds.has(c.framework_id)
    );
    const controlIds = new Set(controls.map((c) => c.id));
    const tests = graph.tests.filter(
      (t) => t.control_id != null && controlIds.has(t.control_id)
    );
    const templateIds = new Set(tests.flatMap((t) => t.template_ids));
    const questions = tests.reduce((sum, t) => sum + t.question_count, 0);

    return {
      ready: frameworks.length > 0,
      controls,
      tests,
      checklists: templateIds.size,
      questions,
    };
  }, [
    graph, sopNum, deptNum, scopeType, domainId, frameworkId, frameworkMatches,
  ]);

  const needsDomain = scopeType === "domain";
  const needsFramework = scopeType === "framework";
  const blocked = !policyId || !departmentId;

  function resetBelowPolicy() {
    setDomainId("");
    setFrameworkId("");
  }

  const selectClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400";

  return (
    <div className="space-y-4">
      {/* Hidden inputs carry the resolved scope to the server action. The
          server re-resolves from these, so they are inputs to a lookup —
          not a list of rows the client gets to choose. */}
      <input type="hidden" name="scope_type" value={scopeType} />
      <input type="hidden" name="domain_id" value={derivedDomain?.id ?? ""} />
      <input type="hidden" name="framework_id" value={needsFramework ? frameworkId : ""} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1) Policy / SOP */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Policy / SOP <span className="text-red-500">*</span>
          </label>
          <select
            name="policy_id"
            value={policyId}
            onChange={(e) => {
              setPolicyId(e.target.value);
              resetBelowPolicy();
            }}
            required
            disabled={!departmentId}
            className={selectClass}
          >
            <option value="">
              {!departmentId
                ? "— Pick the audited department first —"
                : availablePolicies.length === 0
                ? "— No policies mapped to this department yet —"
                : "— Choose a policy —"}
            </option>
            {availablePolicies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* 2) Scope type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Scope Type <span className="text-red-500">*</span>
          </label>
          <select
            value={scopeType}
            onChange={(e) => {
              setScopeType(e.target.value as ScopeType);
              resetBelowPolicy();
            }}
            disabled={blocked}
            className={selectClass}
          >
            <option value="full_sop">{SCOPE_TYPE_LABEL.full_sop}</option>
            <option value="framework">{SCOPE_TYPE_LABEL.framework}</option>
            <option value="domain">{SCOPE_TYPE_LABEL.domain}</option>
          </select>
          <p className="text-[11px] text-gray-400 mt-1">
            {SCOPE_TYPE_HINT[scopeType]}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 3) Domain — a real picker in domain mode, read-only context
               otherwise so the auditor still sees where they are. */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Domain{" "}
            {needsDomain ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-gray-400 font-normal">(if applicable)</span>
            )}
          </label>
          {needsDomain ? (
            <select
              value={domainId}
              onChange={(e) => {
                setDomainId(e.target.value);
                setFrameworkId("");
              }}
              disabled={blocked}
              required
              className={selectClass}
            >
              <option value="">
                {availableDomains.length === 0
                  ? "— No domains for this policy + department —"
                  : "— Choose a domain —"}
              </option>
              {availableDomains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-500 truncate">
              {derivedDomain
                ? derivedDomain.name
                : scopeType === "full_sop"
                ? `All domains (${availableDomains.length})`
                : "—"}
            </div>
          )}
        </div>

        {/* 4) Framework */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Framework{" "}
            {needsFramework ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-gray-400 font-normal">
                (if Framework Audit)
              </span>
            )}
          </label>
          <select
            value={frameworkId}
            onChange={(e) => setFrameworkId(e.target.value)}
            disabled={blocked || !needsFramework}
            required={needsFramework}
            className={selectClass}
          >
            <option value="">
              {!needsFramework
                ? "— Loaded automatically —"
                : availableFrameworks.length === 0
                ? "— No frameworks for this policy + department —"
                : "— Choose a framework —"}
            </option>
            {availableFrameworks.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Scope preview ──────────────────────────────────────────────── */}
      <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg
            className="w-4 h-4 text-blue-500 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 11v5M12 8h.01" />
          </svg>
          <span className="text-xs font-semibold text-gray-700">
            Scope preview
          </span>
        </div>

        <p className="text-[11px] text-gray-500 mb-3">
          The system automatically includes the following based on your scope
          selection.
        </p>

        <div className="grid grid-cols-4 gap-2 text-center">
          {(
            [
              ["Controls", preview.controls.length],
              ["Tests", preview.tests.length],
              ["Checklists", preview.checklists],
              ["Questions", preview.questions],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="bg-white rounded-lg py-2.5 border border-blue-100">
              <div className="text-[11px] text-gray-500">{label}</div>
              <div className="text-lg font-semibold text-gray-900 tabular-nums">
                {preview.ready ? value : "—"}
              </div>
            </div>
          ))}
        </div>

        {preview.ready ? (
          <div className="mt-3 bg-white rounded-lg border border-blue-100 divide-y divide-gray-100">
            <div className="px-3 py-2.5">
              <div className="text-[11px] font-semibold text-gray-500 mb-1.5">
                Included Control(s)
              </div>
              {preview.controls.length === 0 ? (
                <div className="text-[11px] text-amber-700">
                  No controls sit under this scope yet.
                </div>
              ) : (
                <ul className="space-y-1">
                  {preview.controls.map((c) => (
                    <li key={c.id} className="text-xs text-gray-700 flex gap-2">
                      <span className="text-green-600" aria-hidden="true">✓</span>
                      <span>{c.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-3 py-2.5">
              <div className="text-[11px] font-semibold text-gray-500 mb-1.5">
                Included Test(s)
              </div>
              {preview.tests.length === 0 ? (
                <div className="text-[11px] text-amber-700">
                  No tests are linked to these controls yet — the audit would
                  have nothing to answer.
                </div>
              ) : (
                <ul className="space-y-1">
                  {preview.tests.map((t) => (
                    <li key={t.id} className="text-xs text-gray-700 flex gap-2">
                      <span className="text-green-600" aria-hidden="true">✓</span>
                      <span>{t.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-gray-400">
            {blocked
              ? "Pick the audited department and a policy to see what this audit will cover."
              : needsFramework
              ? "Pick a framework to see what this audit will cover."
              : needsDomain
              ? "Pick a domain to see what this audit will cover."
              : "Nothing is mapped to this policy for the selected department yet."}
          </p>
        )}
      </div>
    </div>
  );
}
