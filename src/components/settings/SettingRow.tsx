import type { ReactNode } from "react";

interface SettingRowProps {
  label: string;
  helper?: string;
  children: ReactNode;
  last?: boolean;
}

export function SettingRow({ label, helper, children, last }: SettingRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3.5 ${
        !last ? "border-b border-gray-100 dark:border-gray-800/50" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {label}
        </div>
        {helper && (
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 leading-relaxed">
            {helper}
          </div>
        )}
      </div>
      <div className="shrink-0 flex items-center">{children}</div>
    </div>
  );
}
