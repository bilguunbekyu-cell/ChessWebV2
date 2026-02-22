import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  BarChart3,
  History,
  MoreHorizontal,
  Swords,
  UserRoundPlus,
  UserCheck,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProfileStats, TabType } from "./types";
import { ProfileAvatarUpload } from "./ProfileAvatarUpload";
import { useFriendChallengeStore } from "../../store/friendChallengeStore";

export type Relationship = "self" | "none" | "friends";
type PresenceStatus =
  | "online"
  | "offline"
  | "searching_match"
  | "in_game"
  | "away";

function parseDate(input?: string | Date | null): Date | null {
  if (!input) return null;
  const parsed = input instanceof Date ? input : new Date(input);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function formatRelativeTime(input?: string | Date | null): string {
  const date = parseDate(input);
  if (!date) return "unknown";

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const mins = Math.floor(diffMs / (60 * 1000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function presenceText(status: PresenceStatus, lastSeen?: string | Date | null) {
  if (status === "in_game") return "In game";
  if (status === "searching_match") return "Searching for match";
  if (status === "away") return "Away";
  if (status === "online") return "Online";
  const seen = formatRelativeTime(lastSeen);
  return seen === "unknown" ? "Offline" : `Last seen ${seen}`;
}

function presenceDotClass(status: PresenceStatus) {
  if (status === "online") return "bg-emerald-500";
  if (status === "in_game") return "bg-amber-500";
  if (status === "searching_match") return "bg-sky-500";
  if (status === "away") return "bg-yellow-500";
  return "bg-gray-400";
}

function resolveAvatarUrl(avatar?: string) {
  if (!avatar) return "";
  if (
    avatar.startsWith("http://") ||
    avatar.startsWith("https://") ||
    avatar.startsWith("data:") ||
    avatar.startsWith("blob:")
  ) {
    return avatar;
  }
  const base = import.meta.env.VITE_API_URL || "http://localhost:3001";
  return `${base}${avatar.startsWith("/") ? "" : "/"}${avatar}`;
}

interface ProfileHeaderProps {
  user: {
    fullName?: string;
    email?: string;
    avatar?: string;
    rating?: number;
    blitzRating?: number;
    gamesPlayed?: number;
    gamesWon?: number;
    presenceStatus?: PresenceStatus;
    lastSeenAt?: string | null;
    lastActiveAt?: string | null;
  } | null;
  stats: ProfileStats | null;
  memberSince: string;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isMe?: boolean;
  relationship?: Relationship;
  onAddFriend?: () => void;
  onRemoveFriend?: () => void;
  onChallenge?: () => void;
  friendLoading?: boolean;
}

export function ProfileHeader({
  user,
  stats,
  memberSince,
  activeTab,
  setActiveTab,
  isMe = false,
  relationship = "self",
  onAddFriend,
  onRemoveFriend,
  onChallenge,
  friendLoading,
}: ProfileHeaderProps) {
  const navigate = useNavigate();
  const realtimePresence = useFriendChallengeStore((state) => state.presenceStatus);
  const realtimeLastSeenAt = useFriendChallengeStore((state) => state.lastSeenAt);
  const realtimeConnected = useFriendChallengeStore((state) => state.isConnected);
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick((value) => value + 1);
    }, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const displayName = user?.fullName?.trim() || "Chess Player";
  const totalGames = Math.max(
    Number(stats?.total ?? 0),
    Number(user?.gamesPlayed ?? 0),
  );
  const totalWins = Math.max(
    Number(stats?.wins ?? 0),
    Number(user?.gamesWon ?? 0),
  );
  const winRate =
    typeof stats?.winRate === "number"
      ? stats.winRate
      : totalGames > 0
        ? Math.round((totalWins / totalGames) * 100)
        : 0;
  const effectiveStatus: PresenceStatus = useMemo(() => {
    if (isMe && realtimeConnected) {
      if (
        realtimePresence === "in_game" ||
        realtimePresence === "searching_match" ||
        realtimePresence === "away" ||
        realtimePresence === "online"
      ) {
        return realtimePresence;
      }
      return "online";
    }
    if (
      user?.presenceStatus === "in_game" ||
      user?.presenceStatus === "searching_match" ||
      user?.presenceStatus === "away" ||
      user?.presenceStatus === "online"
    ) {
      return user.presenceStatus;
    }
    return "offline";
  }, [isMe, realtimeConnected, realtimePresence, user?.presenceStatus]);

  const effectiveLastSeen = useMemo(() => {
    if (isMe && realtimeLastSeenAt) return realtimeLastSeenAt;
    return user?.lastSeenAt || null;
  }, [isMe, realtimeLastSeenAt, user?.lastSeenAt]);

  const lastActiveLabel = useMemo(
    () => presenceText(effectiveStatus, effectiveLastSeen),
    [clockTick, effectiveLastSeen, effectiveStatus],
  );
  const showVisitorActions = !isMe && (!!onChallenge || !!onAddFriend || !!onRemoveFriend);

  return (
    <div className="relative">
      <div className="px-4 lg:px-6 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-white/10 bg-gradient-to-br from-white via-gray-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 shadow-[0_12px_35px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_48px_rgba(0,0,0,0.5)] p-4 lg:p-5"
        >
          <div className="pointer-events-none absolute -top-20 -left-12 w-64 h-64 rounded-full bg-teal-400/15 blur-3xl" />
          <div className="relative z-10 flex flex-col xl:flex-row xl:items-start gap-5">
            <div className="flex-shrink-0">
              {isMe ? (
                <ProfileAvatarUpload
                  currentAvatar={user?.avatar}
                  userName={user?.fullName}
                  size="xl"
                  editable={true}
                />
              ) : (
                <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-[0_0_42px_rgba(20,184,166,0.28)] ring-4 ring-white/70 dark:ring-black/30 overflow-hidden flex items-center justify-center text-white text-4xl font-bold">
                  {user?.avatar ? (
                    <img
                      src={resolveAvatarUrl(user.avatar)}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    displayName.substring(0, 2).toUpperCase()
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {displayName}
                  </h1>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      Member since {memberSince}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isMe ? (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate("/settings")}
                        className="px-4 py-2.5 rounded-lg border border-gray-300/80 dark:border-white/15 bg-white/85 dark:bg-black/25 hover:bg-white dark:hover:bg-black/35 text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2 transition-colors"
                      >
                        <Settings size={16} />
                        Edit Profile
                      </button>
                    </>
                  ) : showVisitorActions ? (
                    <>
                      <button
                        type="button"
                        onClick={onChallenge}
                        className="px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors shadow-[0_8px_20px_rgba(13,148,136,0.35)]"
                      >
                        <Swords size={16} />
                        Challenge
                      </button>
                      {relationship === "friends" ? (
                        <button
                          type="button"
                          onClick={onRemoveFriend}
                          disabled={friendLoading}
                          className="px-4 py-2.5 rounded-lg border border-teal-400/40 bg-teal-50/80 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 text-sm font-semibold text-teal-700 dark:text-teal-300 inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <UserCheck size={16} />
                          Friends
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onAddFriend}
                          disabled={friendLoading}
                          className="px-4 py-2.5 rounded-lg border border-gray-300/80 dark:border-white/15 bg-white/85 dark:bg-black/25 hover:bg-white dark:hover:bg-black/35 text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <UserRoundPlus size={16} />
                          Add Friend
                        </button>
                      )}
                      <button
                        type="button"
                        className="w-10 h-10 rounded-lg border border-gray-300/80 dark:border-white/15 bg-white/85 dark:bg-black/25 hover:bg-white dark:hover:bg-black/35 text-gray-700 dark:text-gray-200 inline-flex items-center justify-center transition-colors"
                        aria-label="More profile actions"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200/70 dark:border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Joined{" "}
                  <span className="text-gray-900 dark:text-white">
                    {memberSince}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${presenceDotClass(
                      effectiveStatus,
                    )}`}
                  />
                  {lastActiveLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-5 border-t border-gray-200/70 dark:border-white/10 pt-4">
            <div className="flex gap-1.5 bg-white/70 dark:bg-black/20 border border-gray-200/70 dark:border-white/10 p-1 rounded-xl w-fit backdrop-blur">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === "overview"
                    ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <BarChart3 size={16} />
                Overview
              </button>
              <button
                onClick={() => setActiveTab("games")}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === "games"
                    ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <History size={16} />
                Game History
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
