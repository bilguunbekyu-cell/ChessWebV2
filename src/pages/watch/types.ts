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

export const LIVE_GAMES: LiveGame[] = [];
export const STREAMERS: Streamer[] = [];
