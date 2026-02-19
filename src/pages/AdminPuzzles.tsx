import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  X,
  Check,
  Brain,
  RotateCcw,
  Play,
  Square as SquareIcon,
  Eraser,
  Star,
} from "lucide-react";
import { Chessboard } from "react-chessboard";
import type {
  BoardPosition,
  Piece,
  Square,
} from "react-chessboard/dist/chessboard/types";
import { Chess } from "chess.js";
import AdminSidebar from "../components/AdminSidebar";
import { useAdminStore } from "../store/adminStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface Puzzle {
  _id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  themes: string[];
  description: string;
  icon: string;
  fen: string;
  solution: string[];
  rating: number;
  isWhiteToMove: boolean;
  mateIn?: number;
  timesPlayed: number;
  timesSolved: number;
  featured: boolean;
  createdAt: string;
}

interface PuzzleFormData {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  themes: string;
  description: string;
  icon: string;
  fen: string;
  solution: string;
  rating: number;
  isWhiteToMove: boolean;
  mateIn: number;
  puzzleType: "Mate in 1" | "Mate in 2" | "Mate in 3" | "Best Move" | "Tactics";
}

const defaultFormData: PuzzleFormData = {
  title: "",
  difficulty: "Easy",
  themes: "",
  description: "",
  icon: "🧩",
  fen: "8/8/8/8/8/8/8/8 w - - 0 1",
  solution: "",
  rating: 1200,
  isWhiteToMove: true,
  mateIn: 2,
  puzzleType: "Mate in 2",
};

type SelectedTool = Piece | "eraser" | null;

// Piece image URLs from the same source react-chessboard uses
const PIECE_IMAGES: Record<Piece, string> = {
  wK: "https://react-chessboard.com/img/chesspieces/wikipedia/wK.png",
  wQ: "https://react-chessboard.com/img/chesspieces/wikipedia/wQ.png",
  wR: "https://react-chessboard.com/img/chesspieces/wikipedia/wR.png",
  wB: "https://react-chessboard.com/img/chesspieces/wikipedia/wB.png",
  wN: "https://react-chessboard.com/img/chesspieces/wikipedia/wN.png",
  wP: "https://react-chessboard.com/img/chesspieces/wikipedia/wP.png",
  bK: "https://react-chessboard.com/img/chesspieces/wikipedia/bK.png",
  bQ: "https://react-chessboard.com/img/chesspieces/wikipedia/bQ.png",
  bR: "https://react-chessboard.com/img/chesspieces/wikipedia/bR.png",
  bB: "https://react-chessboard.com/img/chesspieces/wikipedia/bB.png",
  bN: "https://react-chessboard.com/img/chesspieces/wikipedia/bN.png",
  bP: "https://react-chessboard.com/img/chesspieces/wikipedia/bP.png",
};

const WHITE_PIECES: Piece[] = ["wK", "wQ", "wR", "wB", "wN", "wP"];
const BLACK_PIECES: Piece[] = ["bK", "bQ", "bR", "bB", "bN", "bP"];

export default function AdminPuzzles() {
  const navigate = useNavigate();
  const { isAuthenticated, checkAuth } = useAdminStore();
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPuzzle, setEditingPuzzle] = useState<Puzzle | null>(null);
  const [formData, setFormData] = useState<PuzzleFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<SelectedTool>(null);
  const [isRecordingSolution, setIsRecordingSolution] = useState(false);
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [solutionGame, setSolutionGame] = useState<Chess | null>(null);

  useEffect(() => {
    checkAuth();
    fetchPuzzles();
  }, []);

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  const fetchPuzzles = async () => {
    try {
      const res = await fetch(`${API_URL}/api/puzzles`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPuzzles(data);
      }
    } catch (error) {
      console.error("Failed to fetch puzzles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPuzzle(null);
    setFormData(defaultFormData);
    setSelectedPiece(null);
    setIsRecordingSolution(false);
    setSolutionMoves([]);
    setSolutionGame(null);
    setShowModal(true);
  };

  // Convert board position object to FEN
  const positionToFen = (
    position: BoardPosition,
    isWhiteToMove: boolean,
  ): string => {
    const rows: string[] = [];
    for (let rank = 8; rank >= 1; rank--) {
      let row = "";
      let emptyCount = 0;
      for (const file of "abcdefgh") {
        const square = `${file}${rank}`;
        const piece = position[square];
        if (piece) {
          if (emptyCount > 0) {
            row += emptyCount;
            emptyCount = 0;
          }
          // Convert wK -> K, bK -> k, etc.
          const fenPiece =
            piece[0] === "w" ? piece[1].toUpperCase() : piece[1].toLowerCase();
          row += fenPiece;
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) row += emptyCount;
      rows.push(row);
    }
    return `${rows.join("/")} ${isWhiteToMove ? "w" : "b"} - - 0 1`;
  };

  // Convert FEN to board position object
  const fenToPosition = (fen: string): BoardPosition => {
    const position: BoardPosition = {};
    const parts = fen.split(" ");
    const rows = parts[0].split("/");

    rows.forEach((row, rowIndex) => {
      const rank = 8 - rowIndex;
      let fileIndex = 0;
      for (const char of row) {
        if (/\d/.test(char)) {
          fileIndex += parseInt(char);
        } else {
          const file = "abcdefgh"[fileIndex];
          const color = char === char.toUpperCase() ? "w" : "b";
          const piece = char.toUpperCase();
          position[`${file}${rank}`] = `${color}${piece}`;
          fileIndex++;
        }
      }
    });
    return position;
  };

  // Handle clicking on board square to place/remove piece
  const handleSquareClick = (square: Square) => {
    if (isRecordingSolution || !selectedPiece) return;

    setFormData((prevForm) => {
      const nextPosition = fenToPosition(prevForm.fen);

      if (selectedPiece === "eraser") {
        delete nextPosition[square];
      } else {
        nextPosition[square] = selectedPiece;
      }

      return {
        ...prevForm,
        fen: positionToFen(nextPosition, prevForm.isWhiteToMove),
      };
    });
  };

  // Handle recording solution moves
  const onDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (!isRecordingSolution || !solutionGame) return false;

      try {
        const move = solutionGame.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });

        if (move) {
          const newMoves = [...solutionMoves, move.san];
          setSolutionMoves(newMoves);
          setFormData((prev) => ({ ...prev, solution: newMoves.join(", ") }));
          return true;
        }
      } catch {
        return false;
      }
      return false;
    },
    [isRecordingSolution, solutionGame, solutionMoves],
  );

  // Start recording solution
  const startRecordingSolution = () => {
    try {
      const game = new Chess(formData.fen);
      setSolutionGame(game);
      setSolutionMoves([]);
      setIsRecordingSolution(true);
      setSelectedPiece(null);
    } catch (e) {
      alert("Invalid FEN position. Please set up a valid position first.");
    }
  };

  // Stop recording solution
  const stopRecordingSolution = () => {
    setIsRecordingSolution(false);
    setSolutionGame(null);
  };

  // Undo last solution move
  const undoSolutionMove = () => {
    if (solutionGame && solutionMoves.length > 0) {
      solutionGame.undo();
      const newMoves = solutionMoves.slice(0, -1);
      setSolutionMoves(newMoves);
      setFormData((prev) => ({ ...prev, solution: newMoves.join(", ") }));
    }
  };

  // Clear the board
  const clearBoard = () => {
    setFormData((prev) => ({
      ...prev,
      fen: positionToFen({}, prev.isWhiteToMove),
    }));
  };

  // Set starting position
  const setStartingPosition = () => {
    setFormData((prev) => {
      const startFenBase = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
      const startFen = `${startFenBase} ${prev.isWhiteToMove ? "w" : "b"} KQkq - 0 1`;
      return { ...prev, fen: startFen };
    });
  };

  // Update FEN when isWhiteToMove changes
  const handleWhiteToMoveChange = (isWhite: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isWhiteToMove: isWhite,
      fen: positionToFen(fenToPosition(prev.fen), isWhite),
    }));
  };

  // Auto-generate title based on puzzle type
  const generateTitle = () => {
    const title = formData.puzzleType;
    setFormData({ ...formData, title, themes: formData.puzzleType });
  };

  const handleEdit = (puzzle: Puzzle) => {
    setEditingPuzzle(puzzle);
    setSelectedPiece(null);
    setIsRecordingSolution(false);
    setSolutionMoves([]);
    setSolutionGame(null);

    // Determine puzzle type from themes
    let puzzleType: PuzzleFormData["puzzleType"] = "Tactics";
    if (puzzle.themes.includes("Mate in 1")) puzzleType = "Mate in 1";
    else if (puzzle.themes.includes("Mate in 2")) puzzleType = "Mate in 2";
    else if (puzzle.themes.includes("Mate in 3")) puzzleType = "Mate in 3";
    else if (puzzle.themes.includes("Best Move")) puzzleType = "Best Move";

    setFormData({
      title: puzzle.title,
      difficulty: puzzle.difficulty,
      themes: puzzle.themes.join(", "),
      description: puzzle.description,
      icon: puzzle.icon,
      fen: puzzle.fen,
      solution: puzzle.solution.join(", "),
      rating: puzzle.rating,
      isWhiteToMove: puzzle.isWhiteToMove,
      mateIn: puzzle.mateIn || 2,
      puzzleType,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/puzzles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setPuzzles(puzzles.filter((p) => p._id !== id));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error("Failed to delete puzzle:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        title: formData.title,
        difficulty: formData.difficulty,
        themes: formData.themes
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        description: formData.description,
        icon: formData.icon,
        fen: formData.fen,
        solution: formData.solution
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        rating: formData.rating,
        isWhiteToMove: formData.isWhiteToMove,
        mateIn: formData.mateIn,
      };

      const url = editingPuzzle
        ? `${API_URL}/api/admin/puzzles/${editingPuzzle._id}`
        : `${API_URL}/api/admin/puzzles`;

      const res = await fetch(url, {
        method: editingPuzzle ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        fetchPuzzles();
      }
    } catch (error) {
      console.error("Failed to save puzzle:", error);
    } finally {
      setSaving(false);
    }
  };

  const filteredPuzzles = puzzles.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.themes.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const toggleFeatured = async (puzzleId: string, currentFeatured: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/puzzles/${puzzleId}/featured`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ featured: !currentFeatured }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPuzzles(puzzles.map((p) => (p._id === puzzleId ? updated : p)));
      }
    } catch (error) {
      console.error("Failed to toggle featured:", error);
    }
  };

  const featuredCount = puzzles.filter((p) => p.featured).length;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "Medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "Hard":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white">
      <AdminSidebar />

      <main className="ml-72 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Puzzles</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Manage chess puzzles
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors"
            >
              <Plus size={20} />
              Add Puzzle
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search puzzles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Puzzles Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Puzzle
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Difficulty
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Rating
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Stats
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <div className="flex items-center justify-center gap-1">
                        <Star size={14} />
                        Dashboard ({featuredCount}/6)
                      </div>
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPuzzles.map((puzzle) => (
                    <tr
                      key={puzzle._id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{puzzle.icon}</span>
                          <div>
                            <div className="font-medium">{puzzle.title}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {puzzle.themes.slice(0, 2).join(", ")}
                              {puzzle.themes.length > 2 &&
                                ` +${puzzle.themes.length - 2}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(puzzle.difficulty)}`}
                        >
                          {puzzle.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">{puzzle.rating}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {puzzle.timesSolved}/{puzzle.timesPlayed} solved
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() =>
                            toggleFeatured(puzzle._id, puzzle.featured)
                          }
                          disabled={!puzzle.featured && featuredCount >= 6}
                          className={`p-2 rounded-lg transition-colors ${
                            puzzle.featured
                              ? "text-amber-500 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                              : featuredCount >= 6
                                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                : "text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          }`}
                          title={
                            puzzle.featured
                              ? "Remove from dashboard"
                              : featuredCount >= 6
                                ? "Max 6 featured"
                                : "Show on dashboard"
                          }
                        >
                          <Star
                            size={18}
                            fill={puzzle.featured ? "currentColor" : "none"}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(puzzle)}
                            className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                          >
                            <Pencil size={18} />
                          </button>
                          {deleteConfirm === puzzle._id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(puzzle._id)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(puzzle._id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredPuzzles.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No puzzles found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl my-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingPuzzle ? "Edit Puzzle" : "Create Puzzle"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Board Editor */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {isRecordingSolution
                        ? "Record Solution"
                        : "Setup Position"}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={clearBoard}
                        disabled={isRecordingSolution}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={setStartingPosition}
                        disabled={isRecordingSolution}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
                      >
                        Starting
                      </button>
                    </div>
                  </div>

                  {/* Piece Palette */}
                  {!isRecordingSolution && (
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-2">
                      {/* White Pieces Row */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-12">
                          White
                        </span>
                        <div className="flex gap-1">
                          {WHITE_PIECES.map((piece) => (
                            <button
                              key={piece}
                              type="button"
                              onClick={() =>
                                setSelectedPiece(
                                  selectedPiece === piece ? null : piece,
                                )
                              }
                              className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
                                selectedPiece === piece
                                  ? "bg-teal-500 ring-2 ring-teal-400"
                                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                              }`}
                            >
                              <img
                                src={PIECE_IMAGES[piece]}
                                alt={piece}
                                className="w-7 h-7"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Black Pieces Row */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-12">
                          Black
                        </span>
                        <div className="flex gap-1">
                          {BLACK_PIECES.map((piece) => (
                            <button
                              key={piece}
                              type="button"
                              onClick={() =>
                                setSelectedPiece(
                                  selectedPiece === piece ? null : piece,
                                )
                              }
                              className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
                                selectedPiece === piece
                                  ? "bg-teal-500 ring-2 ring-teal-400"
                                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                              }`}
                            >
                              <img
                                src={PIECE_IMAGES[piece]}
                                alt={piece}
                                className="w-7 h-7"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Eraser */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-12">
                          Tool
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPiece(
                              selectedPiece === "eraser" ? null : "eraser",
                            )
                          }
                          className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
                            selectedPiece === "eraser"
                              ? "bg-red-500 text-white"
                              : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                          }`}
                        >
                          <Eraser size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Chessboard */}
                  <div className="aspect-square max-w-[360px] mx-auto">
                    <Chessboard
                      position={
                        isRecordingSolution && solutionGame
                          ? solutionGame.fen()
                          : formData.fen
                      }
                      onSquareClick={handleSquareClick}
                      onPieceDrop={onDrop}
                      boardOrientation={
                        formData.isWhiteToMove ? "white" : "black"
                      }
                      arePiecesDraggable={isRecordingSolution}
                    />
                  </div>

                  {/* Solution Recording Controls */}
                  <div className="flex items-center gap-2">
                    {!isRecordingSolution ? (
                      <button
                        type="button"
                        onClick={startRecordingSolution}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium"
                      >
                        <Play size={16} />
                        Record Solution
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={stopRecordingSolution}
                          className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium"
                        >
                          <SquareIcon size={16} />
                          Stop Recording
                        </button>
                        <button
                          type="button"
                          onClick={undoSolutionMove}
                          disabled={solutionMoves.length === 0}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          <RotateCcw size={16} />
                          Undo
                        </button>
                      </>
                    )}
                  </div>

                  {/* Recorded Moves Display */}
                  {solutionMoves.length > 0 && (
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm font-medium mb-1">
                        Recorded Moves:
                      </div>
                      <div className="font-mono text-sm">
                        {solutionMoves.join(", ")}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Form Fields */}
                <div className="space-y-4">
                  {/* Puzzle Type */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Puzzle Type
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          "Mate in 1",
                          "Mate in 2",
                          "Mate in 3",
                          "Best Move",
                          "Tactics",
                        ] as const
                      ).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              puzzleType: type,
                              themes: type,
                            });
                            if (!formData.title) {
                              setFormData((prev) => ({
                                ...prev,
                                title: type,
                                puzzleType: type,
                                themes: type,
                              }));
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            formData.puzzleType === type
                              ? "bg-teal-600 text-white"
                              : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Who to Move */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Who to Move
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleWhiteToMoveChange(true)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          formData.isWhiteToMove
                            ? "bg-gray-200 dark:bg-gray-600 border-2 border-teal-500"
                            : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        ♔ White to Move
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWhiteToMoveChange(false)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          !formData.isWhiteToMove
                            ? "bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900 border-2 border-teal-500"
                            : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        ♚ Black to Move
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Icon
                      </label>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) =>
                          setFormData({ ...formData, icon: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Difficulty
                      </label>
                      <select
                        value={formData.difficulty}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            difficulty: e.target.value as
                              | "Easy"
                              | "Medium"
                              | "Hard",
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Rating
                      </label>
                      <input
                        type="number"
                        value={formData.rating}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            rating: parseInt(e.target.value) || 1200,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Mate in (moves)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={formData.mateIn}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mateIn: Math.max(
                            1,
                            Math.min(5, parseInt(e.target.value) || 1),
                          ),
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Themes (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.themes}
                      onChange={(e) =>
                        setFormData({ ...formData, themes: e.target.value })
                      }
                      placeholder="Fork, Pin, Sacrifice"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      FEN Position
                    </label>
                    <input
                      type="text"
                      value={formData.fen}
                      onChange={(e) => {
                        setFormData({ ...formData, fen: e.target.value });
                        try {
                          setBoardPosition(fenToPosition(e.target.value));
                        } catch {}
                      }}
                      placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Solution (comma-separated moves)
                    </label>
                    <input
                      type="text"
                      value={formData.solution}
                      onChange={(e) =>
                        setFormData({ ...formData, solution: e.target.value })
                      }
                      placeholder="Qh7+, Kf8, Qh8#"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || isRecordingSolution}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {editingPuzzle ? "Save Changes" : "Create Puzzle"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
