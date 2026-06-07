"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Notification } from "./types";
import { SEVERITY_DOT } from "./types";

type Payload = { items: Notification[]; unread: number };

const POLL_INTERVAL_MS = 30_000;

export default function NotificationBell() {
  const [data, setData] = useState<Payload>({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as Payload;
        setData(json);
      }
    } catch {
      // ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll on mount + every 30s + on every route change.
  useEffect(() => {
    load();
    const t = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    load();
  }, [pathname, load]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    await load();
  }

  async function markOneRead(id: number) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    await load();
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative w-10 h-10 rounded-full bg-white hover:bg-gray-50 border border-gray-200 flex items-center justify-center transition-colors"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-700"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {data.unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {data.unread > 99 ? "99+" : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 w-[380px] bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 overflow-hidden"
          style={{ animation: "notif-pop 150ms ease-out" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {data.unread > 0 && (
                <span className="text-[11px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                  {data.unread}
                </span>
              )}
            </div>
            {data.unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-brand-700 hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            {loading && data.items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">Loading…</div>
            ) : data.items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-4xl mb-2">🎉</div>
                <div className="text-sm text-gray-500">You&apos;re all caught up</div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.items.map((n) => {
                  const itemClass = `block px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !n.is_read ? "bg-brand-50/30" : ""
                  }`;
                  const inner = (
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${SEVERITY_DOT[n.severity]} ${
                          n.is_read ? "opacity-30" : ""
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm leading-snug ${
                            n.is_read ? "text-gray-600" : "text-gray-900 font-medium"
                          }`}
                        >
                          {n.title}
                        </div>
                        {n.body && (
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</div>
                        )}
                        <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5">
                          {n.actor_name && <span>{n.actor_name}</span>}
                          {n.actor_name && <span>·</span>}
                          <span>{timeAgo(n.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.href ? (
                        <Link
                          href={n.href}
                          onClick={() => {
                            markOneRead(n.id);
                            setOpen(false);
                          }}
                          className={itemClass}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div
                          onClick={() => markOneRead(n.id)}
                          className={itemClass}
                        >
                          {inner}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              See all notifications →
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @keyframes notif-pop {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
