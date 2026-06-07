import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, canApproveSops, canEditSops } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { getSopById } from "@/features/sops/repository";
import {
  SOP_STATUS_LABEL,
  SOP_STATUS_TONE,
  type SopStatus,
} from "@/features/sops/types";
import {
  transitionSopAction,
  updateSopImageAction,
  removeSopImageAction,
} from "@/features/sops/actions";
import ImagePicker from "@/features/sops/ImagePicker";

export default async function SopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id: idStr } = await params;
  const id = Number(idStr);
  const sop = await getSopById(id);
  if (!sop) notFound();

  const canApprove = canApproveSops(user.role);
  const canEdit = canEditSops(user.role);
  const isOwner = sop.owner_id === user.id || sop.created_by === user.id;

  const transitions: { label: string; next: SopStatus; tone: string; show: boolean }[] = [
    {
      label: "Submit for review",
      next: "pending_review",
      tone: "bg-amber-600 hover:bg-amber-700",
      show: (sop.status === "draft" || sop.status === "rejected") && (canEdit || isOwner),
    },
    {
      label: "Approve",
      next: "approved",
      tone: "bg-emerald-600 hover:bg-emerald-700",
      show: sop.status === "pending_review" && canApprove,
    },
    {
      label: "Reject",
      next: "rejected",
      tone: "bg-red-600 hover:bg-red-700",
      show: sop.status === "pending_review" && canApprove,
    },
    {
      label: "Archive",
      next: "archived",
      tone: "bg-gray-600 hover:bg-gray-700",
      show: sop.status === "approved" && canEdit,
    },
  ];

  return (
    <Workspace
      section="Compliance / SOPs"
      subtitle={sop.title}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-4">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {sop.code && (
                <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {sop.code}
                </span>
              )}
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${SOP_STATUS_TONE[sop.status]}`}
              >
                {SOP_STATUS_LABEL[sop.status]}
              </span>
              <span className="text-xs text-gray-500">v{sop.version}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{sop.title}</h2>
            {sop.description && (
              <p className="text-gray-600 mt-2 whitespace-pre-line">{sop.description}</p>
            )}
          </div>

          {sop.file_url && (
            <a
              href={sop.file_url}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium whitespace-nowrap"
            >
              Open file ↗
            </a>
          )}
        </div>

        {/* Cover image (if any) */}
        {sop.image_data_url && (
          <div className="mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sop.image_data_url}
              alt={`${sop.title} cover`}
              className="max-w-full max-h-96 rounded-lg border border-gray-200 object-contain bg-gray-50"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {transitions
            .filter((t) => t.show)
            .map((t) => (
              <form key={t.next} action={transitionSopAction}>
                <input type="hidden" name="id" value={sop.id} />
                <input type="hidden" name="status" value={t.next} />
                <button
                  type="submit"
                  className={`${t.tone} text-white px-4 py-2 rounded-lg text-sm font-medium`}
                >
                  {t.label}
                </button>
              </form>
            ))}
          <Link
            href="/sops"
            className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
          >
            ← Back to list
          </Link>
        </div>
      </div>

      {/* Manage image (editors only) */}
      {canEdit && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Cover image
          </h3>

          {sop.image_data_url ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Replace the current cover or remove it. Changes are recorded in the audit log.
              </p>
              <form action={updateSopImageAction} className="space-y-3">
                <input type="hidden" name="id" value={sop.id} />
                <ImagePicker name="image_file" initialPreviewUrl={null} />
                <button
                  type="submit"
                  className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Replace image
                </button>
              </form>

              <form action={removeSopImageAction} className="pt-2 border-t border-gray-100">
                <input type="hidden" name="id" value={sop.id} />
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:text-red-800 hover:underline"
                >
                  Remove the current image
                </button>
              </form>
            </div>
          ) : (
            <form action={updateSopImageAction} className="space-y-3">
              <input type="hidden" name="id" value={sop.id} />
              <ImagePicker name="image_file" />
              <button
                type="submit"
                className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Upload image
              </button>
            </form>
          )}
        </div>
      )}

      {/* Metadata grid */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
          Details
        </h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Field label="Brand">{sop.brand_name ?? "—"}</Field>
          <Field label="Department">{sop.department_name ?? "—"}</Field>
          <Field label="Owner">{sop.owner_name ?? "—"}</Field>
          <Field label="Created by">{sop.created_by_name ?? "—"}</Field>
          <Field label="Effective date">{formatDate(sop.effective_date)}</Field>
          <Field label="Next review">{formatDate(sop.review_date)}</Field>
          <Field label="Created at">{formatDateTime(sop.created_at)}</Field>
          <Field label="Last updated">{formatDateTime(sop.updated_at)}</Field>
          {sop.approved_by_name && (
            <>
              <Field label="Approved by">{sop.approved_by_name}</Field>
              <Field label="Approved at">{formatDateTime(sop.approved_at)}</Field>
            </>
          )}
        </dl>
      </div>
    </Workspace>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</dt>
      <dd className="text-gray-900">{children}</dd>
    </div>
  );
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}
function formatDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}
