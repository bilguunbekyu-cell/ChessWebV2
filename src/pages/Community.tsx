import { useState } from "react";
import {
  MessageSquare,
  Heart,
  Share2,
  MoreHorizontal,
  Image as ImageIcon,
  Send,
} from "lucide-react";
import Sidebar from "../components/Sidebar";

const POSTS = [
  {
    id: 1,
    user: "Magnus Carlsen",
    handle: "@magnuscarlsen",
    avatar: "M",
    content:
      "Just had an intense game against Hikaru! The endgame was tricky but managed to find the winning line. ♟️",
    likes: "12.5k",
    comments: "842",
    time: "2h ago",
    image: null,
  },
  {
    id: 2,
    user: "Chess.com",
    handle: "@chesscom",
    avatar: "C",
    content:
      "🏆 Tournament Update: The Candidates 2024 is heating up! Who is your pick to challenge the World Champion?",
    likes: "8.2k",
    comments: "1.2k",
    time: "4h ago",
    image: true,
  },
  {
    id: 3,
    user: "Hikaru Nakamura",
    handle: "@gmhikaru",
    avatar: "H",
    content: "Streaming Titled Tuesday in 30 minutes! Come hang out.",
    likes: "5.1k",
    comments: "320",
    time: "5h ago",
    image: null,
  },
];

export default function Community() {
  const [newPost, setNewPost] = useState("");

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white flex transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 ml-64 flex">
        {/* Main Feed */}
        <div className="flex-1 max-w-2xl border-r border-gray-200 dark:border-gray-800 min-h-screen">
          <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4">
            <h1 className="text-xl font-bold">Community</h1>
          </header>

          {/* Create Post */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex space-x-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold shrink-0">
                GM
              </div>
              <div className="flex-1">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full bg-transparent border-none focus:ring-0 text-lg placeholder-gray-500 dark:placeholder-gray-400 resize-none h-24"
                />
                <div className="flex justify-between items-center mt-2">
                  <button className="text-teal-500 hover:bg-teal-500/10 p-2 rounded-full transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-1.5 rounded-full font-bold text-sm transition-colors flex items-center space-x-2">
                    <span>Post</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Feed */}
          <div>
            {POSTS.map((post) => (
              <div
                key={post.id}
                className="p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
              >
                <div className="flex space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold shrink-0">
                    {post.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold hover:underline">
                          {post.user}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          {post.handle}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          · {post.time}
                        </span>
                      </div>
                      <button className="text-gray-400 hover:text-teal-500 transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="mt-2 text-gray-800 dark:text-gray-200 leading-relaxed">
                      {post.content}
                    </p>

                    {post.image && (
                      <div className="mt-3 rounded-xl bg-gray-200 dark:bg-gray-800 h-64 w-full flex items-center justify-center text-gray-500">
                        <ImageIcon className="w-12 h-12 opacity-50" />
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-4 max-w-md text-gray-500 dark:text-gray-400">
                      <button className="flex items-center space-x-2 hover:text-teal-500 transition-colors group">
                        <MessageSquare className="w-5 h-5 group-hover:bg-teal-500/10 rounded-full p-0.5" />
                        <span className="text-sm">{post.comments}</span>
                      </button>
                      <button className="flex items-center space-x-2 hover:text-pink-500 transition-colors group">
                        <Heart className="w-5 h-5 group-hover:bg-pink-500/10 rounded-full p-0.5" />
                        <span className="text-sm">{post.likes}</span>
                      </button>
                      <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors group">
                        <Share2 className="w-5 h-5 group-hover:bg-blue-500/10 rounded-full p-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar (Trending) */}
        <div className="w-80 p-6 hidden lg:block">
          <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-4">
            <h2 className="font-bold text-xl mb-4">Trending</h2>
            <div className="space-y-4">
              {[
                "#ChessOlympiad",
                "Magnus vs Hikaru",
                "Queen's Gambit",
                "Titled Tuesday",
              ].map((topic) => (
                <div
                  key={topic}
                  className="flex justify-between items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                >
                  <div>
                    <div className="font-bold text-sm">{topic}</div>
                    <div className="text-xs text-gray-500">12.5k posts</div>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-teal-500 text-sm font-medium hover:underline">
              Show more
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
