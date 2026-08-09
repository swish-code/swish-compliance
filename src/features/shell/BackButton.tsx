"use client";

import { useRouter } from "next/navigation";

/**
 * Global back button, shown in the Workspace header on every page.
 *
 * Uses browser history (router.back()) rather than a fixed href, so it
 * always returns to wherever the user actually came from — a filtered
 * list, a search result, another entity's detail page — instead of a
 * hardcoded parent route that may not match how they navigated in.
 * Falls back to /my-work when there's no in-app history (e.g. the page
 * was opened directly from a bookmark or notification link).
 */
export default function BackButton() {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/my-work");
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      className="shrink-0 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 px-2.5 py-1.5 -ml-2.5 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}
