import { PlayCircle } from "lucide-react";
import { STREAMERS } from "./types";

export function StreamersSection() {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
        <PlayCircle className="w-5 h-5 text-purple-500 mr-2" />
        Live Streamers
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STREAMERS.map((streamer) => (
          <div
            key={streamer.name}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center space-x-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer shadow-sm"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center font-bold text-lg text-white">
                {streamer.avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 rounded-full border-2 border-white dark:border-gray-900">
                LIVE
              </div>
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 dark:text-white truncate">
                {streamer.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {streamer.title}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                {streamer.viewers} watching
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
