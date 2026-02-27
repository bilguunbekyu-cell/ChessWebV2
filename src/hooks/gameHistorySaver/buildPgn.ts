import { Chess } from "chess.js";
import { formatDate, formatTime } from "./utils";

interface PgnHeadersParams {
  startDate: Date;
  endDate: Date;
  whiteName: string;
  blackName: string;
  whiteElo: number;
  blackElo: number;
  pgnResult: string;
  terminationText: string;
  timeControlStr: string;
  ecoCode: string;
  ecoUrl: string;
  currentFen: string;
  moves?: string[];
}

export function buildSanMoveText(moves: string[], pgnResult?: string): string {
  if (!Array.isArray(moves) || moves.length === 0) {
    return pgnResult || "";
  }

  const chunks: string[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMove = moves[i];
    const blackMove = moves[i + 1];
    chunks.push(`${moveNumber}. ${whiteMove}`);
    if (blackMove) chunks.push(blackMove);
  }

  if (pgnResult) chunks.push(pgnResult);
  return chunks.join(" ").trim();
}

export function buildFullPgn(
  currentGame: Chess,
  params: PgnHeadersParams,
): string {
  const {
    startDate,
    endDate,
    whiteName,
    blackName,
    whiteElo,
    blackElo,
    pgnResult,
    terminationText,
    timeControlStr,
    ecoCode,
    ecoUrl,
    currentFen,
    moves,
  } = params;

  const pgnHeaders = [
    `[Event "Live Chess"]`,
    `[Site "NeonGambit"]`,
    `[Date "${formatDate(startDate)}"]`,
    `[Round "-"]`,
    `[White "${whiteName}"]`,
    `[Black "${blackName}"]`,
    `[Result "${pgnResult}"]`,
    `[CurrentPosition "${currentFen}"]`,
    `[Timezone "UTC"]`,
    `[ECO "${ecoCode}"]`,
    `[ECOUrl "${ecoUrl}"]`,
    `[TimeControl "${timeControlStr}"]`,
    `[UTCDate "${formatDate(startDate)}"]`,
    `[UTCTime "${formatTime(startDate)}"]`,
    `[WhiteElo "${whiteElo}"]`,
    `[BlackElo "${blackElo}"]`,
    `[Termination "${terminationText}"]`,
    `[StartTime "${formatTime(startDate)}"]`,
    `[EndDate "${formatDate(endDate)}"]`,
    `[EndTime "${formatTime(endDate)}"]`,
    `[Link ""]`,
    `[WhiteUrl ""]`,
    `[WhiteCountry ""]`,
    `[WhiteTitle ""]`,
    `[BlackUrl ""]`,
    `[BlackCountry ""]`,
    `[BlackTitle ""]`,
  ].join("\n");

  const moveText =
    Array.isArray(moves) && moves.length > 0
      ? buildSanMoveText(moves, pgnResult)
      : `${currentGame.pgn()} ${pgnResult}`.trim();
  return `${pgnHeaders}\n\n${moveText}`;
}
