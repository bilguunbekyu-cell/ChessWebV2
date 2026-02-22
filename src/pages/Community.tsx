/* ═══════════════════════════════════════════════════════
   Community — Premium Redesign
   ═══════════════════════════════════════════════════════ */
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { FilterTabs } from "../components/community/FilterTabs";
import { PostComposer } from "../components/community/PostComposer";
import { PostCard } from "../components/community/PostCard";
import {
  TrendingWidget,
  LiveGamesWidget,
  TopPlayersWidget,
  PuzzleLeaderboardWidget,
  WhoToFollowWidget,
  EventsWidget,
  DailyPuzzleWidget,
} from "../components/community/SidebarWidgets";
import {
  COMMUNITY_POSTS,
  COMMUNITY_TABS,
  type CommunityTab,
} from "../data/communityData";

export default function Community() {
  const [activeTab, setActiveTab] = useState<CommunityTab>("for-you");
  const [searchQuery] = useState("");

  /* ── Filter posts by tab ── */
  const filteredPosts = useMemo(() => {
    let posts = COMMUNITY_POSTS;
    if (activeTab === "games") posts = posts.filter((p) => p.pgn || p.fen);
    else if (activeTab === "puzzles")
      posts = posts.filter((p) => p.tags?.includes("puzzle"));
    else if (activeTab === "tournaments")
      posts = posts.filter(
        (p) => p.tags?.includes("tournament") || p.tags?.includes("candidates"),
      );
    else if (activeTab === "videos")
      posts = posts.filter(
        (p) => p.tags?.includes("stream") || p.tags?.includes("video"),
      );
    // "for-you" and "following" show all

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.user.name.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return posts;
  }, [activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white flex transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 ml-72 min-h-screen">
        {/* ── Sticky Header ── */}
        <header className="sticky top-0 z-30 bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60">
          {/* Tabs */}
          <div className="max-w-[1440px] mx-auto px-6">
            <FilterTabs
              tabs={COMMUNITY_TABS}
              activeTab={activeTab}
              onTabChange={(t) => setActiveTab(t as CommunityTab)}
            />
          </div>
        </header>

        {/* ── Content Grid ── */}
        <div className="max-w-[1440px] mx-auto flex justify-center gap-6 px-6 py-6">
          {/* Feed Column */}
          <div className="flex-1 min-w-0 max-w-2xl space-y-5">
            <PostComposer />

            {filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
                <Search className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">No posts found</p>
                <p className="text-xs mt-1">
                  Try a different tab or search term
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post, i) => (
                  <PostCard key={post.id} post={post} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="hidden xl:block w-80 shrink-0 space-y-4 pb-10">
            <DailyPuzzleWidget />
            <TrendingWidget />
            <LiveGamesWidget />
            <TopPlayersWidget />
            <PuzzleLeaderboardWidget />
            <WhoToFollowWidget />
            <EventsWidget />

            {/* Footer */}
            <div className="px-3 pt-2">
              <p className="text-[10px] text-gray-400 dark:text-gray-600 leading-relaxed">
                About · Help · Terms · Privacy · Ads · API ·{" "}
                <span className="font-semibold text-gray-500 dark:text-gray-500">
                  NeonGambit
                </span>{" "}
                © {new Date().getFullYear()}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
