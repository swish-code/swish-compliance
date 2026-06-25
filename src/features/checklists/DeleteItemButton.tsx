"use client";

import { useTransition } from "react";
import { deleteItemAction } from "./actions";

/**
 * Wraps the delete-item server action in a small client form so we can
 * show a confirm() prompt before the row is destroyed. Without this the
 * server action fires on the first click and the question is gone with
 * no recovery (the action hard-deletes, no soft-delete column).
 */
export default function DeleteItemButton({
  itemId,
  templateId,
  question,
}: {
  itemId: number;
  templateId: number;
  question: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const preview =
      question.length > 80 ? question.slice(0, 80) + "…" : question;
    const ok = window.confirm(
      `Delete this question?\n\n"${preview}"\n\nThis can't be undone.`
    );
    if (!ok) return;
    const fd = new FormData();
    fd.append("id", String(itemId));
    fd.append("template_id", String(templateId));
    startTransition(async () => {
      await deleteItemAction(fd);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="inline">
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
    </form>
  );
}
