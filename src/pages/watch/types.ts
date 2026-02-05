export interface LiveGame {
  id: number;
  white: string;
  whiteRating: number;
  black: string;
  blackRating: number;
  viewers: string;
  time: string;
  type: string;
}

export interface Streamer {
  name: string;
  viewers: string;
  title: string;
  avatar: string;
}

export const LIVE_GAMES: LiveGame[] = [
  {
    id: 1,
    white: "Magnus Carlsen",
    whiteRating: 2830,
    black: "Hikaru Nakamura",
    blackRating: 2780,
    viewers: "45k",
    time: "10+0",
    type: "Blitz",
  },
  {
    id: 2,
    white: "Alireza Firouzja",
    whiteRating: 2760,
    black: "Fabiano Caruana",
    blackRating: 2790,
    viewers: "32k",
    time: "3+2",
    type: "Blitz",
  },
  {
    id: 3,
    white: "Ding Liren",
    whiteRating: 2780,
    black: "Ian Nepomniachtchi",
    blackRating: 2770,
    viewers: "28k",
    time: "90+30",
    type: "Classical",
  },
  {
    id: 4,
    white: "Gukesh D",
    whiteRating: 2750,
    black: "Praggnanandhaa",
    blackRating: 2740,
    viewers: "15k",
    time: "15+10",
    type: "Rapid",
  },
  {
    id: 5,
    white: "Wesley So",
    whiteRating: 2760,
    black: "Levon Aronian",
    blackRating: 2750,
    viewers: "12k",
    time: "3+0",
    type: "Blitz",
  },
  {
    id: 6,
    white: "Anish Giri",
    whiteRating: 2745,
    black: "Maxime Vachier-Lagrave",
    blackRating: 2740,
    viewers: "10k",
    time: "5+0",
    type: "Blitz",
  },
];

export const STREAMERS: Streamer[] = [
  { name: "Hikaru", viewers: "25k", title: "Road to 3300 Blitz", avatar: "H" },
  { name: "GothamChess", viewers: "18k", title: "Guess the ELO", avatar: "G" },
  {
    name: "BotezLive",
    viewers: "12k",
    title: "Street Chess Hustling",
    avatar: "B",
  },
  { name: "ChessBrah", viewers: "8k", title: "Techno Chess", avatar: "C" },
];
