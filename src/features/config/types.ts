export type ConfigOption = {
  id: number;
  kind: string;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Every "kind" of editable list in the system, with metadata telling the
 * admin where each list shows up. The Config page renders one section per
 * entry from this catalog.
 */
export type ConfigKind = {
  key: string;
  title: string;
  description: string;
  usedOn: string[];          // user-facing labels of pages where this appears
  editable: boolean;         // false = informational only (locked in code)
  managedAt?: string;        // for locked / external lists, where to go instead
  managedAtLabel?: string;   // human label for the managedAt link, e.g. "Brands tab"
  note?: string;
};

export const CONFIG_KINDS: ConfigKind[] = [
  {
    key: "checklist_category",
    title: "Checklist categories",
    description:
      "Categories you can pick when creating an audit checklist template.",
    usedOn: [
      "Compliance → Checklists → New Template (Category dropdown)",
      "Compliance → Checklists → [template] → Edit (Category dropdown)",
    ],
    editable: true,
  },
  {
    key: "framework_category",
    title: "Framework categories",
    description:
      "Labels used to group compliance frameworks (Food Safety, HSE, Legal…).",
    usedOn: ["Compliance → Frameworks (category badge on each card)"],
    editable: true,
  },
  {
    key: "control_category",
    title: "Control categories",
    description:
      "Categories used when creating a control (e.g. Preventive, Detective, Corrective).",
    usedOn: [
      "Compliance → Controls → New Control (Category dropdown)",
      "Compliance → Controls → [control] (Category display)",
    ],
    editable: true,
  },
  {
    key: "_brands",
    title: "Brands",
    description:
      "Brands appear in many dropdowns (SOPs, Audits, CAPAs, Users, Controls…).",
    usedOn: ["Everywhere with a Brand filter or selector"],
    editable: false,
    managedAt: "/admin/config?tab=brands",
    managedAtLabel: "the Brands tab",
  },
  {
    key: "_departments",
    title: "Departments",
    description:
      "Departments are referenced in SOPs, Audits, CAPAs, Users and reports.",
    usedOn: ["Everywhere with a Department filter or selector"],
    editable: false,
    managedAt: "/admin/config?tab=departments",
    managedAtLabel: "the Departments tab",
  },
  {
    key: "_sop_status",
    title: "SOP workflow statuses",
    description:
      "SOP lifecycle states (Draft → Pending review → Approved → Rejected → Archived).",
    usedOn: ["Compliance → SOPs (status badge + filter)"],
    editable: false,
    note:
      "Locked. The status values drive the approval workflow and the audit-log events. Adding new statuses needs a code change.",
  },
  {
    key: "_capa_severity",
    title: "CAPA severity levels",
    description: "Low · Medium · High · Critical — used when creating CAPAs.",
    usedOn: ["Compliance → Corrective Actions → New / Detail"],
    editable: false,
    note:
      "Locked. Severity values are tied to colour coding and the auto-CAPA logic (critical findings get a critical CAPA).",
  },
  {
    key: "_check_frequency",
    title: "Check frequencies",
    description: "Daily · Weekly · Monthly · Quarterly · Annual · On demand.",
    usedOn: ["Workspace → Tests → New check"],
    editable: false,
    note:
      "Locked. Each frequency is used by the engine to compute the next due date for a check.",
  },
];
