import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Bot, ChevronDown, Crown, Loader2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import type { BotPersonality } from "../../data/botPersonalities";
import { BOARD_FRAME } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const CATEGORY_INFO: {
  key: BotPersonality["category"];
  label: string;
  icon: string;
}[] = [
  { key: "beginner", label: "Beginner", icon: "🌱" },
  { key: "casual", label: "Casual", icon: "☕" },
  { key: "intermediate", label: "Intermediate", icon: "⚔️" },
  { key: "advanced", label: "Advanced", icon: "🎯" },
  { key: "master", label: "Master", icon: "👑" },
];

// Map database bot to BotPersonality interface
function mapDbBotToPersonality(dbBot: any): BotPersonality {
  // Construct full avatar URL - uploaded images are stored on server
  let avatarUrl = dbBot.avatarUrl || "";
  if (avatarUrl && !avatarUrl.startsWith("http")) {
    avatarUrl = `${API_URL}${avatarUrl.startsWith("/") ? "" : "/"}${avatarUrl}`;
  }
  
  return {
    id: dbBot._id,
    name: dbBot.name,
    avatar: dbBot.avatar || "🤖",
    avatarUrl,
    rating: dbBot.eloRating,
    title: dbBot.title || undefined,
    description: dbBot.description || "",
    personality: dbBot.personality || dbBot.quote || "",
    playStyle: dbBot.playStyle || "balanced",
    skillLevel: dbBot.skillLevel || 5,
    depth: dbBot.depth || 10,
    thinkTimeMs: dbBot.thinkTimeMs || 2000,
    blunderChance: dbBot.blunderChance || 0,
    aggressiveness: dbBot.aggressiveness || 0,
    openingBook: dbBot.openingBook ?? true,
    category: dbBot.difficulty || "beginner",
  };
}

export default function PlayWithBot() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Bot data state
  const [bots, setBots] = useState<BotPersonality[]>([]);
  const [groupedBots, setGroupedBots] = useState<
    Record<string, BotPersonality[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBot, setSelectedBot] = useState<BotPersonality | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<
    BotPersonality["category"] | null
  >("beginner");

  // Responsive board width
  const [boardWidth, setBoardWidth] = useState(620);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);

  // Fetch bots from API
  useEffect(() => {
    async function fetchBots() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/bots`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch bots");
        }

        const data = await res.json();

        // Map database bots to BotPersonality interface
        const mappedBots = data.bots.map(mapDbBotToPersonality);
        setBots(mappedBots);

        // Group bots by category
        const grouped: Record<string, BotPersonality[]> = {};
        mappedBots.forEach((bot: BotPersonality) => {
          if (!grouped[bot.category]) {
            grouped[bot.category] = [];
          }
          grouped[bot.category].push(bot);
        });
        setGroupedBots(grouped);

        // Select first bot from first available category
        if (mappedBots.length > 0) {
          setSelectedBot(mappedBots[0]);
          // Expand the category of the first bot
          setExpandedCategory(mappedBots[0].category);
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching bots:", err);
        setError("Failed to load bots");
      } finally {
        setLoading(false);
      }
    }

    fetchBots();
  }, []);

  useEffect(() => {
    const container = leftRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const padding = 24;
      const headerH = 60;
      const footerH = 48;
      const availableWidth = rect.width - padding - BOARD_FRAME;
      const availableHeight = rect.height - headerH - footerH - padding;
      const size = Math.floor(Math.min(availableWidth, availableHeight));
      setBoardWidth(Math.max(400, Math.min(size, 720)));
    };

    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(container);
    window.addEventListener("resize", updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const handleStartMatch = () => {
    if (!selectedBot) return;
    // Navigate to the bot game page
    navigate(`/play/bot/${selectedBot.id}`);
  };

  const toggleCategory = (cat: BotPersonality["category"]) => {
    setExpandedCategory(expandedCategory === cat ? null : cat);
  };

  // Bot selection screen - Chess.com inspired layout
  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full bg-slate-100 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden pb-10"
    >
      <div className="h-full grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side - Board Preview with Bot Info */}
        <div
          ref={leftRef}
          className="flex flex-col items-center justify-center p-4 pb-10 gap-4 h-full"
        >
          {/* Top Bot Info Bar */}
          <div className="w-full max-w-[900px] flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
              {selectedBot?.avatarUrl ? (
                <img
                  src={selectedBot.avatarUrl}
                  alt={selectedBot.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{selectedBot?.name?.substring(0, 2).toUpperCase() || "?"}</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 dark:text-white">
                  {selectedBot?.name || "Select Bot"}
                </span>
                {selectedBot?.title && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">
                    {selectedBot.title}
                  </span>
                )}
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({selectedBot?.rating || "---"})
                </span>
              </div>
            </div>
          </div>

          {/* Chess Board Preview */}
          <div
            className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200/60 dark:border-white/10"
            style={{ width: boardWidth }}
          >
            <Chessboard
              boardWidth={boardWidth}
              position="start"
              arePiecesDraggable={false}
              customDarkSquareStyle={{ backgroundColor: "#779556" }}
              customLightSquareStyle={{ backgroundColor: "#ebecd0" }}
            />
          </div>

          {/* Bottom Player Info Bar */}
          <div className="w-full max-w-[900px] flex items-center gap-3 px-2 justify-start">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.fullName || "You"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{user?.fullName?.substring(0, 1).toUpperCase() || "Y"}</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <span className="font-bold text-gray-900 dark:text-white">
                {user?.fullName || "You"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side - Bot Selection Panel */}
        <div className="w-full bg-white/90 dark:bg-slate-900/95 border-l border-gray-200/60 dark:border-white/10 flex flex-col h-full">
          {/* Panel Header */}
          <div className="p-4 border-b border-gray-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-teal-500" />
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                Play Bots
              </h2>
            </div>
          </div>

          {/* Selected Bot Hero */}
          {selectedBot && (
            <div
              className="p-3 border-b border-gray-200/60 dark:border-white/10 space-y-2"
              style={{ minHeight: "15vh" }}
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                  {selectedBot.avatarUrl ? (
                    <img
                      src={selectedBot.avatarUrl}
                      alt={selectedBot.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{selectedBot.name.substring(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="relative bg-gray-100 dark:bg-slate-800 rounded-lg p-2">
                    <p className="text-xs text-gray-700 dark:text-gray-300 italic line-clamp-2">
                      "{selectedBot.personality}"
                    </p>
                    <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-gray-100 dark:border-t-slate-800" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {selectedBot.name}
                    </span>
                    <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
                      {selectedBot.rating}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {selectedBot.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Category Sections */}
          <div className="flex-1 overflow-hidden flex flex-col overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                <span className="ml-2 text-gray-500">Loading bots...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-10">
                <p className="text-red-500">{error}</p>
              </div>
            ) : (
              CATEGORY_INFO.map((cat) => {
                const categoryBots = groupedBots[cat.key] || [];
                const isExpanded = expandedCategory === cat.key;

                // Only show categories that have bots
                if (categoryBots.length === 0) return null;

                return (
                  <div
                    key={cat.key}
                    className="border-b border-gray-200/60 dark:border-white/10 py-1"
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(cat.key)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {cat.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {categoryBots.length}{" "}
                          {categoryBots.length === 1 ? "bot" : "bots"}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>

                    {/* Bot Avatars Grid */}
                    {isExpanded && (
                      <div className="px-3 pb-2 grid grid-cols-5 gap-1.5">
                        {categoryBots.map((bot) => (
                          <button
                            key={bot.id}
                            onClick={() => setSelectedBot(bot)}
                            className={`relative w-11 h-11 rounded-lg overflow-hidden transition-all hover:scale-105 ${
                              selectedBot?.id === bot.id
                                ? "ring-2 ring-teal-500"
                                : "ring-1 ring-gray-200 dark:ring-slate-700 hover:ring-gray-300 dark:hover:ring-slate-600"
                            }`}
                            title={`${bot.name} (${bot.rating})`}
                          >
                            {bot.avatarUrl ? (
                              <img
                                src={bot.avatarUrl}
                                alt={bot.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                                <span className="text-white font-bold text-xs">{bot.name.substring(0, 2).toUpperCase()}</span>
                              </div>
                            )}
                            {bot.title && (
                              <Crown className="absolute -top-1 -right-1 w-3 h-3 text-amber-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Play Button */}
          <div className="p-3 pb-12 border-t border-gray-200/60 dark:border-white/10">
            <button
              onClick={handleStartMatch}
              disabled={!selectedBot}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              Play
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
