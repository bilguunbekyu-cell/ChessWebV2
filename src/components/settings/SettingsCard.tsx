import type { ReactNode } from "react";

interface SettingsCardProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  accent?: string; // gradient from color
}

export function SettingsCard({
  icon,
  title,
  subtitle,
  children,
  className = "",
  accent,
}: SettingsCardProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl shadow-sm transition-colors duration-300 ${className}`}
    >
      {/* Subtle glow accent */}
      {accent && (
        <div
          className={`absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none ${accent}`}
        />
      )}
      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800/60">
          {icon && <span className="shrink-0">{icon}</span>}
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {/* Body */}
        <div className="px-6 py-4 space-y-1">{children}</div>
      </div>
    </section>
  );
}
