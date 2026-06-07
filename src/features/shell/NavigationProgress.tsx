"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * NProgress-style top loading bar.
 * - Triggered on any internal-link click — bar appears instantly so the
 *   user sees feedback the moment they click (no waiting for the server).
 * - Animates to ~70 % while the new page is being prepared on the server.
 * - Completes to 100 % as soon as the pathname or search params actually
 *   change (i.e. the new page committed), then fades out.
 * - All-CSS, no external dependency.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeyRef = useRef<string>("");
  const startedAtRef = useRef<number>(0);

  const navKey = pathname + "?" + (searchParams?.toString() ?? "");

  function start() {
    // If already running, ignore — we don't want to reset mid-flight.
    if (tickRef.current) return;
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
    startedAtRef.current = Date.now();
    setVisible(true);
    setProgress(8);
    // Animate up to ~70 % over ~3 s, then plateau.
    tickRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 70) return p;
        const inc = p < 30 ? 4 : p < 50 ? 2 : 1;
        return Math.min(70, p + inc);
      });
    }, 120);
  }

  function complete() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setProgress(100);
    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      // Reset after fade-out finishes so the next nav starts clean.
      hideRef.current = setTimeout(() => setProgress(0), 220);
    }, 200);
  }

  // 1) Click on any internal anchor → start the bar immediately.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Ignore middle/right click, modified clicks, defaultPrevented, etc.
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as Element | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      // External, hash, mailto, tel → skip.
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }
      // Same-page hash → skip.
      try {
        const url = new URL(anchor.href, window.location.href);
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        // ignore parse errors
      }
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // 2) When the route actually changes, complete the bar.
  useEffect(() => {
    if (lastKeyRef.current && lastKeyRef.current !== navKey) {
      complete();
    }
    lastKeyRef.current = navKey;
  }, [navKey]);

  // 3) Safety: if the bar runs for >12s without completion, hide it.
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (Date.now() - startedAtRef.current > 12000) complete();
    }, 12000);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[2px] z-[100] pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease-out",
      }}
    >
      <div
        className="h-full bg-gradient-to-r from-emerald-400 via-emerald-400 to-emerald-300"
        style={{
          width: `${progress}%`,
          transition: "width 240ms cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 0 10px rgba(52, 211, 153, 0.55), 0 0 4px rgba(52, 211, 153, 0.8)",
        }}
      />
    </div>
  );
}
