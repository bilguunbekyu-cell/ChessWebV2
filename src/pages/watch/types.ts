// Legacy types - kept for backward compatibility
// New types are in src/utils/lichessApi.ts and src/hooks/useWatchPage.ts

export interface LiveGame {
  id: number | string;
  white: string;
  whiteRating: number;
  whiteTitle?: string;
  black: string;
  blackRating: number;
  blackTitle?: string;
  viewers: string;
  time: string;
  type: string;
  speed?: string;
  gameUrl?: string;
}

export interface Streamer {
  id?: string;
  name: string;
  title?: string;
  viewers: string;
  streamTitle?: string;
  avatar: string;
  platform?: "twitch" | "youtube";
  url?: string;
}

// Mock data removed - now using Lichess API
export const LIVE_GAMES: LiveGame[] = [];
export const STREAMERS: Streamer[] = [];
