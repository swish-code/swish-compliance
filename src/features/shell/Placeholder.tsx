export default function Placeholder({ name }: { name: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
      <div className="text-5xl mb-3">🚧</div>
      <h2 className="text-lg font-semibold text-gray-700 mb-2">
        {name} — coming soon
      </h2>
      <p className="text-sm text-gray-500 max-w-md mx-auto">
        This module is part of the planned MVP scope. The SOPs module is fully
        functional — start there.
      </p>
    </div>
  );
}
