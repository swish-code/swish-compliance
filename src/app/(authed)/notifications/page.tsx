import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { listForUser, unreadCount } from "@/features/notifications/repository";
import { SEVERITY_DOT, SEVERITY_TONE } from "@/features/notifications/types";
import {
  markReadAction,
  markAllReadAction,
  deleteNotificationAction,
  clearReadAction,
} from "@/features/notifications/actions";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  ceo: "CEO",
  business_excellence: "Business Excellence",
  compliance: "Compliance",
  opex: "Operational Excellence",
  department_manager: "Department Manager",
  auditor: "Auditor",
  viewer: "Viewer",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: "unread" | "all" }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter = sp.filter ?? "all";

  const items = await listForUser(user.id, {
    limit: 100,
    unreadOnly: filter === "unread",
  });
  const unread = await unreadCount(user.id);

  return (
    <Workspace
      section="Workspace"
      subtitle={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <Link
            href="/notifications"
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === "all"
                ? "bg-brand-700 text-white border-brand-700"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            All
          </Link>
          <Link
            href="/notifications?filter=unread"
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              filter === "unread"
                ? "bg-brand-700 text-white border-brand-700"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Unread
            {unread > 0 && (
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                  filter === "unread"
                    ? "bg-white/20 text-white"
                    : "bg-red-500 text-white"
                }`}
              >
                {unread}
              </span>
            )}
          </Link>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <form action={markAllReadAction}>
              <button
                type="submit"
                className="text-xs text-brand-700 hover:underline font-medium"
              >
                Mark all read
              </button>
            </form>
          )}
          <form action={clearReadAction}>
            <button
              type="submit"
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear read
            </button>
          </form>
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
          <div className="text-5xl mb-3">{filter === "unread" ? "🎉" : "📭"}</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            {filter === "unread" ? "You're all caught up!" : "No notifications yet"}
          </h2>
          <p className="text-sm text-gray-500">
            {filter === "unread"
              ? "When something needs your attention it will show up here."
              : "Notifications about SOPs, audits, CAPAs and more will appear here."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {items.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors ${
                  !n.is_read ? "bg-brand-50/20" : ""
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 mt-2 rounded-full shrink-0 ${SEVERITY_DOT[n.severity]} ${
                    n.is_read ? "opacity-30" : ""
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <div className="flex-1 min-w-0">
                      {n.href ? (
                        <Link
                          href={n.href}
                          className={`text-sm leading-snug hover:text-brand-700 ${
                            n.is_read ? "text-gray-700" : "text-gray-900 font-medium"
                          }`}
                        >
                          {n.title}
                        </Link>
                      ) : (
                        <span
                          className={`text-sm leading-snug ${
                            n.is_read ? "text-gray-700" : "text-gray-900 font-medium"
                          }`}
                        >
                          {n.title}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${SEVERITY_TONE[n.severity]}`}
                    >
                      {n.severity}
                    </span>
                  </div>
                  {n.body && (
                    <p className="text-xs text-gray-500 mb-2 whitespace-pre-line">
                      {n.body}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 flex-wrap">
                    {n.actor_name && (
                      <>
                        <span className="font-medium text-gray-600">{n.actor_name}</span>
                        {n.actor_role && (
                          <span className="text-gray-400">
                            ({ROLE_LABEL[n.actor_role] ?? n.actor_role})
                          </span>
                        )}
                        <span>·</span>
                      </>
                    )}
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {!n.is_read && (
                    <form action={markReadAction}>
                      <input type="hidden" name="id" value={n.id} />
                      <button
                        type="submit"
                        className="text-xs text-brand-700 hover:underline"
                      >
                        Mark read
                      </button>
                    </form>
                  )}
                  <form action={deleteNotificationAction}>
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className="text-xs text-gray-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Workspace>
  );
}
