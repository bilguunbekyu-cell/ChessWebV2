import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const puzzleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    default: "Medium",
  },
  themes: [String],
  description: { type: String, default: "" },
  icon: { type: String, default: "🧩" },
  fen: { type: String, required: true },
  solution: [String],
  rating: { type: Number, default: 1200 },
  isWhiteToMove: { type: Boolean, default: true },
  timesPlayed: { type: Number, default: 0 },
  timesSolved: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const Puzzle = mongoose.model("Puzzle", puzzleSchema);

function parsePuzzle3File(content) {
  const puzzles = [];
  const lines = content.split("\n");
  const normalizeFen = (fen) => {
    const parts = fen.trim().split(/\s+/);
    if (parts.length >= 6) {
      const halfmove = Number.isNaN(parseInt(parts[4], 10))
        ? 0
        : parseInt(parts[4], 10);
      let fullmove = parseInt(parts[5], 10);
      if (Number.isNaN(fullmove) || fullmove < 1) fullmove = 1;
      parts[4] = String(halfmove);
      parts[5] = String(fullmove);
      return parts.slice(0, 6).join(" ");
    }
    return fen.trim();
  };

  let i = 0;

  while (i < lines.length && !lines[i].includes(" vs ")) {
    i++;
  }

  while (i < lines.length) {
    const citationLine = lines[i]?.trim();
    if (!citationLine || !citationLine.includes(" vs ")) {
      i++;
      continue;
    }

    i++;
    const fenLine = lines[i]?.trim();
    if (!fenLine || !fenLine.includes("/")) {
      continue;
    }

    i++;
    const solutionLine = lines[i]?.trim();
    if (!solutionLine) {
      continue;
    }

    const citation = citationLine;

    const solutionMoves = [];

    const cleanedSolution = solutionLine
      .replace(/\d+\.(\.\.)?\s*/g, "") 
      .replace(/\s+/g, " ") 
      .trim();

    const moves = cleanedSolution
      .split(" ")
      .map((m) => m.trim())
      .filter(
        (m) =>
          m.length > 0 &&
          m !== "*" &&
          m !== "..." &&
          m !== ".." &&
          !/^(1-0|0-1|1\/2-1\/2)$/.test(m),
      )
      .map((m) => m.replace(/[?!]+$/g, ""));
    solutionMoves.push(...moves);

    const fenParts = fenLine.split(" ");
    const sideToMove = fenParts[1] || "w";
    const isWhiteToMove = sideToMove === "w";

    puzzles.push({
      citation,
      fen: normalizeFen(fenLine),
      solution: solutionMoves,
      isWhiteToMove,
    });

    i++;

    while (i < lines.length && lines[i].trim() === "") {
      i++;
    }
  }

  return puzzles;
}

async function importPuzzles(count = 10) {
  try {

    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB");

    const filePath = path.join(
      __dirname,
      "..",
      "src",
      "data",
      "Puzzle3",
      "PuzzleData.txt",
    );

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const puzzles = parsePuzzle3File(fileContent);

    console.log(`Found ${puzzles.length} puzzles in file`);

    const importedPuzzles = [];
    let imported = 0;

    for (let i = 0; i < Math.min(count, puzzles.length); i++) {
      const p = puzzles[i];

      const exists = await Puzzle.findOne({ fen: p.fen });
      if (exists) {
        console.log(`Puzzle already exists, skipping: ${p.citation}`);
        continue;
      }

      const puzzle = new Puzzle({
        title: `Mate in 2 - ${p.citation.split(",")[0]}`,
        difficulty: "Medium",
        themes: ["Mate in 2", "Checkmate"],
        description: `Historic game: ${p.citation}. ${p.isWhiteToMove ? "White" : "Black"} to play and deliver checkmate in 2 moves.`,
        icon: "👑",
        fen: p.fen,
        solution: p.solution,
        rating: 1400,
        isWhiteToMove: p.isWhiteToMove,
      });

      await puzzle.save();
      importedPuzzles.push(puzzle);
      imported++;
      console.log(`✓ Imported: ${puzzle.title}`);
    }

    console.log(`\n✅ Successfully imported ${imported} puzzles!`);

    await mongoose.connection.close();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error importing puzzles:", error);
    process.exit(1);
  }
}

const count = parseInt(process.argv[2]) || 10;
console.log(`Importing ${count} puzzles from Puzzle3...\n`);

importPuzzles(count);
