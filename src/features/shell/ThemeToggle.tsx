"use client";

import { useEffect, useState } from "react";

/**
 * Light/Dark/System theme toggle.
 *
 * Storage key: 'swish:theme' with values 'light' | 'dark' | 'system'.
 * The actual class on <html> is set by the inline script in layout.tsx
 * BEFORE React hydrates, so there's no flash. This component only
 * handles the runtime toggle and updates the html class going forward.
 */

type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "swish:theme";

function readStored(): Theme {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

function effectiveIsDark(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  // system
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme): void {
  const isDark = effectiveIsDark(theme);
  document.documentElement.classList.toggle("dark", isDark);
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(readStored());
  }, []);

  // Listen for OS-level changes when the user is on 'system'
  useEffect(() => {
    if (!mounted) return;
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange() {
      applyTheme("system");
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, mounted]);

  function pick(next: Theme) {
    setTheme(next);
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore quota / privacy errors
    }
    applyTheme(next);
  }

  // Render a stable placeholder on the server so hydration matches.
  // Once mounted, swap to the real interactive control.
  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={compact ? "w-9 h-9" : "h-9 w-[120px]"}
      />
    );
  }

  if (compact) {
    // Cycle: light → dark → system → light (icon-only)
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    const isDarkNow = effectiveIsDark(theme);
    const icon = theme === "system" ? "🖥️" : isDarkNow ? "🌙" : "☀️";
    const label =
      theme === "system" ? "Theme: system" : isDarkNow ? "Theme: dark" : "Theme: light";
    return (
      <button
        type="button"
        onClick={() => pick(next)}
        title={`${label} — click for ${next}`}
        aria-label={label}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-base bg-white/[0.08] hover:bg-white/[0.14] active:bg-white/[0.18] border border-white/[0.10] hover:border-white/[0.18] text-white hover:text-white transition-all duration-150"
      >
        <span>{icon}</span>
      </button>
    );
  }

  // 3-segment pill switch — desktop sidebar
  const segments: Array<{ value: Theme; icon: string; label: string }> = [
    { value: "light", icon: "☀️", label: "Light" },
    { value: "system", icon: "🖥️", label: "System" },
    { value: "dark", icon: "🌙", label: "Dark" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="grid grid-cols-3 gap-0.5 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]"
    >
      {segments.map((s) => {
        const active = theme === s.value;
        return (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => pick(s.value)}
            title={s.label}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
              active
                ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30"
                : "text-white/85 hover:text-white hover:bg-white/[0.10]"
            }`}
          >
            <span className="text-xs">{s.icon}</span>
            <span className="hidden md:inline">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
