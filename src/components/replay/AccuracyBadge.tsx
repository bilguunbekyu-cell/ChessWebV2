interface AccuracyBadgeProps {
  name: string;
  accuracy: number | null;
  highlight?: boolean;
}

export function AccuracyBadge({
  name,
  accuracy,
  highlight,
}: AccuracyBadgeProps) {
  return (
    <div
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-sm ${
        highlight
          ? "border-teal-400 bg-teal-50 dark:bg-teal-900/20"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
      }`}
    >
      <span className="text-gray-500 dark:text-gray-400 text-xs">{name}</span>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {accuracy !== null ? accuracy.toFixed(1) : "—"}
      </div>
    </div>
  );
}
