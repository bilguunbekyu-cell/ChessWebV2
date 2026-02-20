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
}

/**
 * Build full PGN string with headers
 */
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

  const moveText = currentGame.pgn();
  return `${pgnHeaders}\n\n${moveText} ${pgnResult}`;
}
