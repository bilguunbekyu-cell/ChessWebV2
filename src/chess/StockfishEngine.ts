export type PlayStyle = "aggressive" | "defensive" | "balanced" | "random";

export class StockfishEngine {
  private stockfish: Worker | null;
  private skillLevel: number = 10;
  private playStyle: PlayStyle = "balanced";
  private multiPvMoves: string[] = [];

  constructor() {
    this.stockfish =
      typeof Worker !== "undefined" ? new Worker("/stockfish.js") : null;
    this.onMessage = this.onMessage.bind(this);

    if (this.stockfish) {
      this.sendMessage("uci");
      this.sendMessage("isready");
    }
  }

  // Set Stockfish skill level (0-20). Lower = weaker play with more mistakes
  setSkillLevel(level: number) {
    this.skillLevel = Math.max(0, Math.min(20, level));
    if (this.stockfish) {
      this.sendMessage(`setoption name Skill Level value ${this.skillLevel}`);
    }
  }

  // Set playing style
  setPlayStyle(style: PlayStyle) {
    this.playStyle = style;
    if (this.stockfish) {
      // Contempt: positive = aggressive (avoids draws), negative = defensive
      let contempt = 0;
      switch (style) {
        case "aggressive":
          contempt = 50;
          break;
        case "defensive":
          contempt = -50;
          break;
        case "balanced":
          contempt = 0;
          break;
        case "random":
          contempt = Math.floor(Math.random() * 100) - 50;
          break;
      }
      this.sendMessage(`setoption name Contempt value ${contempt}`);
    }
  }

  onMessage(callback: (data: { bestMove: string }) => void) {
    if (this.stockfish) {
      // Use onmessage to ensure we only have one active listener at a time
      // prevents memory leaks and multiple callbacks firing
      this.stockfish.onmessage = (e) => {
        // Log for debugging
        // console.log("Stockfish says:", e.data);

        const bestMove = e.data?.match(/bestmove\s+(\S+)/)?.[1];
        // Collect MultiPV moves for variety
        const pvMatch = e.data?.match(/multipv (\d+).*? pv (\S+)/);
        if (pvMatch) {
          const pvIndex = parseInt(pvMatch[1]) - 1;
          this.multiPvMoves[pvIndex] = pvMatch[2];
        }
        if (bestMove) {
          callback({ bestMove });
        }
      };

      // Also handle errors
      this.stockfish.onerror = (e) => {
        console.error("Stockfish Worker Error:", e);
      };
    }
  }

  evaluatePosition(
    fen: string,
    depth: number,
    moveNumber: number = 10,
    minTimeMs: number = 3000,
  ) {
    if (this.stockfish) {
      this.multiPvMoves = [];

      // Use MultiPV for opening variety (first 10 moves)
      const useMultiPv = moveNumber <= 10;
      if (useMultiPv) {
        this.sendMessage("setoption name MultiPV value 5");
      } else {
        this.sendMessage("setoption name MultiPV value 1");
      }

      this.stockfish.postMessage(`position fen ${fen}`);
      // ensure engine thinks at least minTimeMs
      this.stockfish.postMessage(
        `go movetime ${Math.max(minTimeMs, 3000)} depth ${depth}`,
      );
    }
  }

  // Get a random move from top moves (for opening variety)
  getRandomTopMove(): string | null {
    const validMoves = this.multiPvMoves.filter((m) => m);
    if (validMoves.length > 1) {
      // Weight towards better moves but still allow variety
      const weights = validMoves.map((_, i) => Math.pow(0.6, i));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;

      for (let i = 0; i < validMoves.length; i++) {
        random -= weights[i];
        if (random <= 0) return validMoves[i];
      }
    }
    return null;
  }

  stop() {
    this.sendMessage("stop");
  }

  quit() {
    this.sendMessage("quit");
  }

  private sendMessage(message: string) {
    if (this.stockfish) {
      this.stockfish.postMessage(message);
    }
  }
}
