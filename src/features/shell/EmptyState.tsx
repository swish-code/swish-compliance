/** Shared empty-state block — one look for "nothing here yet" everywhere. */
export default function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="py-8 text-center text-sm text-gray-400">
      <div className="text-2xl mb-1">{icon}</div>
      {text}
    </div>
  );
}
