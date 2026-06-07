"use client";

import { useEffect, useRef, useState } from "react";
import { transitionSopAction } from "./actions";

type TransitionView = {
  to: string;
  label: string;
  description: string;
  tone: string;
  commentRequired: boolean;
};

export default function ApprovalActions({
  sopId,
  transitions,
}: {
  sopId: number;
  transitions: TransitionView[];
}) {
  const [open, setOpen] = useState<TransitionView | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting]);

  if (transitions.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        {transitions.map((t) => (
          <button
            key={t.to}
            type="button"
            onClick={() => setOpen(t)}
            className={`${t.tone} text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all whitespace-nowrap`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {open && (
        <CommentModal
          sopId={sopId}
          transition={open}
          onClose={() => !submitting && setOpen(null)}
          submitting={submitting}
          setSubmitting={setSubmitting}
        />
      )}
    </>
  );
}

function CommentModal({
  sopId,
  transition,
  onClose,
  submitting,
  setSubmitting,
}: {
  sopId: number;
  transition: TransitionView;
  onClose: () => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea when the modal opens.
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      await transitionSopAction(formData);
      // The server action revalidates; the page will re-render with the
      // new state. We don't need to call onClose() — the modal unmounts
      // when the parent re-renders.
    } catch (err) {
      // The action threw — surface the message and let the user retry.
      setSubmitting(false);
      alert(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ animation: "modal-backdrop 150ms ease-out" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-modal-title"
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
        style={{ animation: "modal-card 200ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-2">
          <h3 id="approval-modal-title" className="text-lg font-semibold text-gray-900 mb-1">
            {transition.label}
          </h3>
          <p className="text-sm text-gray-500">{transition.description}</p>
        </div>

        <form action={handleSubmit} className="px-6 pb-6">
          <input type="hidden" name="id" value={sopId} />
          <input type="hidden" name="status" value={transition.to} />

          <div className="mt-4">
            <label
              htmlFor="approval-comment"
              className="block text-xs font-medium text-gray-700 mb-1.5"
            >
              Comment {transition.commentRequired && <span className="text-red-500">*</span>}
            </label>
            <textarea
              ref={textareaRef}
              id="approval-comment"
              name="comment"
              required={transition.commentRequired}
              rows={4}
              placeholder={
                transition.commentRequired
                  ? "Required — this comment is stored in the approval history."
                  : "Optional — stored in the approval history if provided."
              }
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              {transition.commentRequired
                ? "A comment is mandatory for this action."
                : "Adding a comment is recommended but not required."}
            </p>
          </div>

          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`${transition.tone} text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all`}
            >
              {submitting ? "Submitting…" : transition.label}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modal-backdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modal-card {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
