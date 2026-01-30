import { motion } from "framer-motion";

interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

export function ProgressBar({ label, value, total, color }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-600 dark:text-gray-400 font-medium">
          {label}
        </span>
        <span className="text-gray-900 dark:text-white font-bold">
          {value}{" "}
          <span className="text-gray-400 font-normal">({percentage}%)</span>
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}
