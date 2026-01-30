import { ArrowLeft } from "lucide-react";
import { AdvantageGraph } from "./AdvantageGraph";
import { AccuracyBadge } from "./AccuracyBadge";
import { QualityBreakdown } from "./QualityBreakdown";
import { GameHistory } from "../../historyTypes";
import { MoveQualityInfo } from "../../utils/moveQuality";
import { QualityCounts } from "../../hooks/useGameReplay";

function coachLine(moveQualities: MoveQualityInfo[], game: GameHistory) {
  if (!moveQualities.length) return "Play the game to see insights.";

  const final = moveQualities[moveQualities.length - 1];
  const bigSwing = [...moveQualities].sort((a, b) => b.epLoss - a.epLoss)[0];

  if (bigSwing && bigSwing.epLoss > 0.25) {
    return `${bigSwing.mover === "w" ? game.white : game.black} lost control on move ${bigSwing.ply}.`;
  }

  if (final.epAfter > 0.7) return `${game.white} kept the pressure and converted.`;
  if (final.epAfter < 0.3) return `${game.black} turned the tables late in the game.`;

  return "Tight game—small edges decided it.";
}

export function GameSummary({
  game,
  accuracy,
  qualityCounts,
  moveQualities,
  cpSeries,
  onBack,
}: {
  game: GameHistory;
  accuracy: { white: number | null; black: number | null };
  qualityCounts: { white: QualityCounts; black: QualityCounts };
  moveQualities: MoveQualityInfo[];
  cpSeries: Array<{ cp?: number; mate?: number } | undefined>;
  onBack?: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Game Analysis
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {game.white} vs {game.black}
            </div>
            <div className="text-sm text-gray-500">
              {game.date} • {game.timeControl} • {game.result}
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 max-w-sm text-right">
          {coachLine(moveQualities, game)}
        </div>
      </div>

      <AdvantageGraph cps={cpSeries} />

      <div className="flex flex-wrap items-center gap-3">
        <AccuracyBadge
          name={game.white}
          accuracy={accuracy.white}
          highlight={accuracy.white !== null && accuracy.white >= (accuracy.black || 0)}
        />
        <AccuracyBadge
          name={game.black}
          accuracy={accuracy.black}
          highlight={accuracy.black !== null && accuracy.black > (accuracy.white || 0)}
        />
      </div>

      <QualityBreakdown white={qualityCounts.white} black={qualityCounts.black} />
    </div>
  );
}
