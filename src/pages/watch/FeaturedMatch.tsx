import { Trophy, Eye } from "lucide-react";

export function FeaturedMatch() {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
          <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
          Featured Match
        </h2>
        <span className="text-teal-600 dark:text-teal-500 text-sm font-medium cursor-pointer hover:underline">
          View all tournaments
        </span>
      </div>

      <div className="bg-white dark:bg-gradient-to-r dark:from-gray-900 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-teal-500/10 dark:group-hover:bg-teal-500/20"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Player 1 */}
          <div className="flex items-center space-x-4 flex-1 justify-end">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                Magnus Carlsen
              </div>
              <div className="text-gray-500 dark:text-gray-400 font-mono">
                2830
              </div>
            </div>
            <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center text-2xl shadow-lg">
              ♟️
            </div>
          </div>

          {/* VS / Score */}
          <div className="flex flex-col items-center px-8">
            <div className="text-sm font-bold text-teal-600 dark:text-teal-500 tracking-widest mb-2">
              LIVE
            </div>
            <div className="text-4xl font-black text-gray-900 dark:text-white font-mono flex items-center space-x-4">
              <span>1</span>
              <span className="text-gray-400 dark:text-gray-600 text-2xl">
                -
              </span>
              <span>0</span>
            </div>
            <div className="mt-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
              Blitz 3+2
            </div>
          </div>

          {/* Player 2 */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center text-2xl shadow-lg">
              ♙
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                Hikaru Nakamura
              </div>
              <div className="text-gray-500 dark:text-gray-400 font-mono">
                2780
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-teal-900/20 hover:scale-105">
            <Eye className="w-5 h-5" />
            <span>Watch Game</span>
          </button>
        </div>
      </div>
    </section>
  );
}
