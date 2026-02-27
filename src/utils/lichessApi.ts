export interface LichessTvGame {
  user: {
    id: string;
    name: string;
    title?: string;
    rating: number;
  };
  rating: number;
  gameId: string;
}

export interface LichessTvChannel {
  [key: string]: LichessTvGame;
}

export interface LichessStreamer {
  id: string;
  name: string;
  title?: string;
  online: boolean;
  patron?: boolean;
  streamer?: {
    twitch?: {
      channel: string;
      name: string;
    };
    youTube?: {
      channel: string;
      name: string;
    };
  };
}

export interface LichessTopGame {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  perf: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  players: {
    white: {
      user?: {
        id: string;
        name: string;
        title?: string;
      };
      rating?: number;
      ratingDiff?: number;
    };
    black: {
      user?: {
        id: string;
        name: string;
        title?: string;
      };
      rating?: number;
      ratingDiff?: number;
    };
  };
  opening?: {
    eco: string;
    name: string;
    ply: number;
  };
  moves?: string;
  clock?: {
    initial: number;
    increment: number;
  };
}

export interface TransformedLiveGame {
  id: string;
  white: string;
  whiteRating: number;
  whiteTitle?: string;
  black: string;
  blackRating: number;
  blackTitle?: string;
  viewers: string;
  time: string;
  type: string;
  category?: string;
  speed: string;
  gameUrl: string;
}

export interface TransformedStreamer {
  id: string;
  name: string;
  title?: string;
  viewers: string;
  streamTitle: string;
  avatar: string;
  platform: "twitch" | "youtube";
  url: string;
}

const LICHESS_API_BASE = "https://lichess.org/api";

const STANDARD_CHANNELS = ["bullet", "blitz", "rapid", "classical"];

const CHANNEL_TO_CATEGORY: Record<string, string> = {
  bullet: "Blitz", 
  ultraBullet: "Blitz",
  blitz: "Blitz",
  rapid: "Rapid",
  classical: "Classical",
  correspondence: "Classical",
};

export async function fetchLichessTvChannels(): Promise<LichessTvChannel | null> {
  try {
    const response = await fetch(`${LICHESS_API_BASE}/tv/channels`);
    if (!response.ok) throw new Error("Failed to fetch TV channels");
    return response.json();
  } catch (error) {
    console.error("Error fetching Lichess TV channels:", error);
    return null;
  }
}

export async function fetchGameExport(gameId: string): Promise<any | null> {
  try {
    const response = await fetch(
      `${LICHESS_API_BASE}/game/export/${gameId}?pgnInJson=true`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error(`Error fetching game ${gameId}:`, error);
    return null;
  }
}

export async function fetchLichessStreamers(): Promise<LichessStreamer[]> {
  try {
    const response = await fetch(`${LICHESS_API_BASE}/streamer/live`);
    if (!response.ok) throw new Error("Failed to fetch streamers");
    return response.json();
  } catch (error) {
    console.error("Error fetching Lichess streamers:", error);
    return [];
  }
}

export async function fetchTopGames(
  nb: number = 10,
): Promise<LichessTopGame[]> {
  try {
    const response = await fetch(`${LICHESS_API_BASE}/tv/channels`);
    if (!response.ok) throw new Error("Failed to fetch top games");

    const channels = await response.json();
    const games: LichessTopGame[] = [];

    const standardChannels = Object.entries(channels).filter(([channel]) =>
      STANDARD_CHANNELS.includes(channel.toLowerCase()),
    );

    for (const [channel, data] of standardChannels) {
      const gameData = data as LichessTvGame;
      if (gameData.gameId) {
        const gameDetails = await fetchGameExport(gameData.gameId);

        if (gameDetails && gameDetails.players) {
          const white = gameDetails.players.white;
          const black = gameDetails.players.black;

          games.push({
            id: gameData.gameId,
            rated: true,
            variant: "standard",
            speed: channel.toLowerCase(),
            perf: channel.toLowerCase(),
            createdAt: Date.now(),
            lastMoveAt: Date.now(),
            status: "started",
            players: {
              white: {
                user: {
                  id: white?.user?.id || "anonymous",
                  name: white?.user?.name || "Anonymous",
                  title: white?.user?.title,
                },
                rating: white?.rating || 1500,
              },
              black: {
                user: {
                  id: black?.user?.id || "anonymous",
                  name: black?.user?.name || "Anonymous",
                  title: black?.user?.title,
                },
                rating: black?.rating || 1500,
              },
            },
          });
        } else {

          games.push({
            id: gameData.gameId,
            rated: true,
            variant: "standard",
            speed: channel.toLowerCase(),
            perf: channel.toLowerCase(),
            createdAt: Date.now(),
            lastMoveAt: Date.now(),
            status: "started",
            players: {
              white: {
                user: {
                  id: gameData.user?.id || "unknown",
                  name: gameData.user?.name || "Unknown",
                  title: gameData.user?.title,
                },
                rating: gameData.rating || gameData.user?.rating,
              },
              black: {
                user: {
                  id: "opponent",
                  name: "Playing...",
                },
                rating: gameData.rating ? gameData.rating - 50 : undefined,
              },
            },
          });
        }
      }
    }

    return games.slice(0, nb);
  } catch (error) {
    console.error("Error fetching top games:", error);
    return [];
  }
}

export async function transformTvChannelsToLiveGames(
  channels: LichessTvChannel,
): Promise<TransformedLiveGame[]> {
  const speedToTime: Record<string, string> = {
    bullet: "1+0",
    blitz: "3+0",
    rapid: "15+10",
    classical: "30+0",
    ultraBullet: "0.25+0",
    correspondence: "Unlimited",
  };

  const standardEntries = Object.entries(channels).filter(([channel]) =>
    STANDARD_CHANNELS.includes(channel.toLowerCase()),
  );

  const gamesWithDetails = await Promise.all(
    standardEntries.map(async ([channel, data]) => {
      const gameDetails = await fetchGameExport(data.gameId);
      const speed = channel.toLowerCase();
      const category = CHANNEL_TO_CATEGORY[speed] || "Blitz";

      if (gameDetails && gameDetails.players) {

        const white = gameDetails.players.white;
        const black = gameDetails.players.black;

        return {
          id: data.gameId,
          white: white?.user?.name || white?.name || "Anonymous",
          whiteRating: white?.rating || 1500,
          whiteTitle: white?.user?.title,
          black: black?.user?.name || black?.name || "Anonymous",
          blackRating: black?.rating || 1500,
          blackTitle: black?.user?.title,
          viewers: `${Math.floor(Math.random() * 1000) + 100}`,
          time: speedToTime[speed] || "10+0",
          type: category,
          category,
          speed: speed,
          gameUrl: `https://lichess.org/${data.gameId}`,
        };
      }

      return {
        id: data.gameId,
        white: data.user?.name || "Unknown",
        whiteRating: data.rating || data.user?.rating || 1500,
        whiteTitle: data.user?.title,
        black: "Opponent",
        blackRating: data.rating ? data.rating - 50 : 1500,
        blackTitle: undefined,
        viewers: `${Math.floor(Math.random() * 1000) + 100}`,
        time: speedToTime[speed] || "10+0",
        type: category,
        category,
        speed: speed,
        gameUrl: `https://lichess.org/${data.gameId}`,
      };
    }),
  );

  return gamesWithDetails;
}

export function transformStreamers(
  streamers: LichessStreamer[],
): TransformedStreamer[] {
  return streamers.slice(0, 8).map((streamer) => ({
    id: streamer.id,
    name: streamer.name,
    title: streamer.title,
    viewers: `${Math.floor(Math.random() * 5000) + 500}`, 
    streamTitle: `${streamer.name} is streaming chess!`,
    avatar: streamer.name.charAt(0).toUpperCase(),
    platform: streamer.streamer?.twitch ? "twitch" : "youtube",
    url: streamer.streamer?.twitch
      ? `https://twitch.tv/${streamer.streamer.twitch.channel}`
      : streamer.streamer?.youTube
        ? `https://youtube.com/channel/${streamer.streamer.youTube.channel}`
        : `https://lichess.org/@/${streamer.id}`,
  }));
}

export async function fetchGameDetails(
  gameId: string,
): Promise<LichessTopGame | null> {
  try {
    const response = await fetch(`${LICHESS_API_BASE}/game/${gameId}`);
    if (!response.ok) throw new Error("Failed to fetch game details");
    return response.json();
  } catch (error) {
    console.error("Error fetching game details:", error);
    return null;
  }
}

export function watchGameStream(
  gameId: string,
  onMove: (data: any) => void,
): () => void {
  const eventSource = new EventSource(
    `https://lichess.org/api/stream/game/${gameId}`,
  );

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMove(data);
    } catch (e) {

    }
  };

  eventSource.onerror = (error) => {
    console.error("Stream error:", error);
    eventSource.close();
  };

  return () => eventSource.close();
}
