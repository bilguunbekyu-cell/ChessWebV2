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
  isMe = true,
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

  return (
    <div className="relative">
      <div className="px-4 lg:px-6 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-5 lg:p-6"
        >
          <div className="flex flex-col xl:flex-row xl:items-start gap-6">
            <div className="flex-shrink-0">
              <ProfileAvatarUpload
                currentAvatar={user?.avatar}
                userName={user?.fullName}
                size="xl"
              />
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
                        className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2 transition-colors"
                      >
                        <Settings size={16} />
                        Edit Profile
                      </button>
                    </>
                  ) : (
                    <>
                      {relationship === "friends" ? (
                        <button
                          type="button"
                          onClick={onRemoveFriend}
                          disabled={friendLoading}
                          className="px-4 py-2.5 rounded-lg border border-teal-400/40 bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 text-sm font-semibold text-teal-700 dark:text-teal-300 inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <UserCheck size={16} />
                          Friends
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onAddFriend}
                          disabled={friendLoading}
                          className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <UserRoundPlus size={16} />
                          Add Friend
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onChallenge}
                        className="px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors"
                      >
                        <Swords size={16} />
                        Challenge
                      </button>
                      <button
                        type="button"
                        className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 inline-flex items-center justify-center transition-colors"
                        aria-label="More profile actions"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
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

          <div className="mt-6 border-t border-gray-200 dark:border-gray-800 pt-4">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === "overview"
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
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
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
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
