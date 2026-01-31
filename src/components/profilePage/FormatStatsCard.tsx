import { Shield } from "lucide-react";
import { timeFormats } from "../../data/mockData";

export function FormatStatsCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Format Ratings
        </h3>
        <Shield className="w-5 h-5 text-teal-500" />
      </div>
      <div className="space-y-3">
        {timeFormats.map((format) => (
          <div
            key={format.id}
            className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{format.icon}</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {format.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {format.displayTime}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {format.rating}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {format.rating > 1850
                  ? "🔥 Hot"
                  : format.rating > 1750
                    ? "📈 Rising"
                    : "📊 Stable"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
