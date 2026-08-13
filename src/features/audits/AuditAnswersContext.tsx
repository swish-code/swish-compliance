"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { saveResponsesBulkAction } from "./actions";

export type AnswerValue = "pass" | "fail" | "na";

type AnswerState = { response: AnswerValue | null; notes: string };

type AuditAnswersContextValue = {
  auditId: number;
  canEdit: boolean;
  get: (itemId: number) => AnswerState;
  setResponse: (itemId: number, response: AnswerValue) => void;
  setNotes: (itemId: number, notes: string) => void;
  /** Item ids whose answer differs from what's stored on the server. */
  dirtyIds: number[];
  answeredCount: number;
  totalCount: number;
  saving: boolean;
  error: string | null;
  savedAt: number | null;
  /** Persists every dirty answer. Returns true when nothing is left unsaved
   *  — Submit uses that to decide whether it's safe to continue. */
  saveAll: () => Promise<boolean>;
};

const Ctx = createContext<AuditAnswersContextValue | null>(null);

export function useAuditAnswers(): AuditAnswersContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useAuditAnswers must be used inside <AuditAnswersProvider>");
  }
  return ctx;
}

/**
 * Holds every question's answer for one audit in a single place, so the
 * page can offer ONE "Save all answers" button (and a Submit that flushes
 * first) instead of a Save per question.
 *
 * The same checklist item can appear under more than one test — the audit
 * stores a single response per (audit_id, item_id), so state is keyed by
 * item id and every on-screen copy of that question stays in sync while
 * the auditor types.
 */
export function AuditAnswersProvider({
  auditId,
  canEdit,
  initial,
  children,
}: {
  auditId: number;
  canEdit: boolean;
  /** One entry per distinct checklist item in the audit's scope. */
  initial: { itemId: number; response: AnswerValue | null; notes: string | null }[];
  children: ReactNode;
}) {
  const buildMap = (
    src: { itemId: number; response: AnswerValue | null; notes: string | null }[]
  ) => {
    const m = new Map<number, AnswerState>();
    for (const r of src) {
      m.set(r.itemId, { response: r.response, notes: r.notes ?? "" });
    }
    return m;
  };

  // `saved` mirrors what the server currently holds; `answers` is what the
  // auditor has on screen. Comparing the two is what makes the unsaved
  // count honest rather than "anything ever touched".
  const [answers, setAnswers] = useState(() => buildMap(initial));
  const [saved, setSaved] = useState(() => buildMap(initial));
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, startSaving] = useTransition();

  const EMPTY: AnswerState = useMemo(() => ({ response: null, notes: "" }), []);

  const get = useCallback(
    (itemId: number) => answers.get(itemId) ?? EMPTY,
    [answers, EMPTY]
  );

  const setResponse = useCallback((itemId: number, response: AnswerValue) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      const cur = next.get(itemId) ?? { response: null, notes: "" };
      next.set(itemId, { ...cur, response });
      return next;
    });
    setError(null);
  }, []);

  const setNotes = useCallback((itemId: number, notes: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      const cur = next.get(itemId) ?? { response: null, notes: "" };
      next.set(itemId, { ...cur, notes });
      return next;
    });
    setError(null);
  }, []);

  const dirtyIds = useMemo(() => {
    const out: number[] = [];
    for (const [itemId, cur] of answers) {
      // A note with no Yes/No/N-A isn't savable — audit_responses.response
      // is what scoring reads, so a note alone would be a silent no-op.
      if (!cur.response) continue;
      const was = saved.get(itemId);
      if (!was || was.response !== cur.response || (was.notes ?? "") !== cur.notes) {
        out.push(itemId);
      }
    }
    return out;
  }, [answers, saved]);

  const answeredCount = useMemo(
    () => [...answers.values()].filter((a) => a.response).length,
    [answers]
  );

  const saveAll = useCallback(async () => {
    if (!canEdit || dirtyIds.length === 0) return true;
    const payload = dirtyIds.map((itemId) => {
      const a = answers.get(itemId)!;
      return { itemId, response: a.response as AnswerValue, notes: a.notes };
    });

    return new Promise<boolean>((resolve) => {
      startSaving(async () => {
        const result = await saveResponsesBulkAction({ auditId, answers: payload });
        if (!result.ok) {
          setError(result.error);
          resolve(false);
          return;
        }
        // Fold the just-saved values into the server mirror so the unsaved
        // count drops to zero without a refetch.
        setSaved((prev) => {
          const next = new Map(prev);
          for (const p of payload) {
            next.set(p.itemId, { response: p.response, notes: p.notes });
          }
          return next;
        });
        setError(null);
        setSavedAt(Date.now());
        resolve(true);
      });
    });
  }, [auditId, canEdit, dirtyIds, answers]);

  const value: AuditAnswersContextValue = {
    auditId,
    canEdit,
    get,
    setResponse,
    setNotes,
    dirtyIds,
    answeredCount,
    totalCount: initial.length,
    saving,
    error,
    savedAt,
    saveAll,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
