"use client";

import { useState, useTransition } from "react";
import { setDepartmentManagerAction } from "./actions";

type UserOption = { id: number; display_name: string; role: string };

/**
 * Auto-saves on change instead of requiring a separate "Save" click.
 *
 * The old markup was a plain <select> + Save button: picking a name in
 * the dropdown highlights it immediately (that's just how <select>
 * works), but nothing was actually saved until Save was clicked. The
 * "No manager set" note below it read from the last-loaded server data,
 * so it stayed stale and contradicted whatever was currently showing in
 * the dropdown — looked like a bug ("I picked someone, why does it still
 * say no manager set?"). Saving immediately on change keeps both in sync.
 */
export default function DepartmentManagerSelect({
  departmentId,
  managerId,
  users,
}: {
  departmentId: number;
  managerId: number | null;
  users: UserOption[];
}) {
  const [value, setValue] = useState(managerId != null ? String(managerId) : "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const previous = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", String(departmentId));
        fd.set("manager_id", next);
        await setDepartmentManagerAction(fd);
      } catch (err) {
        setValue(previous);
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    });
  }

  return (
    <div>
      <select
        value={value}
        onChange={onChange}
        disabled={pending}
        className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[180px] disabled:opacity-60"
      >
        <option value="">— None —</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.display_name} · {u.role.replace("_", " ")}
          </option>
        ))}
      </select>
      {pending && <div className="text-[10px] text-gray-400 mt-0.5">Saving…</div>}
      {!pending && error && (
        <div className="text-[10px] text-red-600 mt-0.5">{error}</div>
      )}
      {!pending && !error && !value && (
        <div className="text-[10px] text-amber-600 mt-0.5">No manager set</div>
      )}
    </div>
  );
}
