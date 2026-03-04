import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  MessageCircle,
  Search,
  ShieldBan,
  Undo2,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface Friend {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  rating?: number;
  since: string;
}

interface SearchResult {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  rating?: number;
}

interface IncomingRequest {
  requestId: string;
  from: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    rating?: number;
  };
  createdAt: string;
}

interface OutgoingRequest {
  requestId: string;
  to: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    rating?: number;
  };
  createdAt: string;
}

interface BlockedUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  rating?: number;
  blockedAt: string;
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
  return `${API_URL}${avatar.startsWith("/") ? "" : "/"}${avatar}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

function ProfileAvatar({
  name,
  avatar,
  onClick,
  size = "md",
}: {
  name: string;
  avatar?: string;
  onClick?: () => void;
  size?: "sm" | "md";
}) {
  const className = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <button
      type="button"
      className={`${className} rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold overflow-hidden flex items-center justify-center shrink-0`}
      onClick={onClick}
    >
      {avatar ? (
        <img
          src={resolveAvatarUrl(avatar)}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        name.substring(0, 2).toUpperCase()
      )}
    </button>
  );
}

export default function Friends() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newFriendName, setNewFriendName] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    try {
      setLoadingFriends(true);
      const res = await fetch(`${API_URL}/api/friends`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch friends");
      const data = await res.json();
      const items = (Array.isArray(data.friends) ? data.friends : []) as Friend[];
      setFriends(
        items.map((item) => ({
          ...item,
          since: formatDate(item.since),
        })),
      );
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  const loadFriendRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const res = await fetch(`${API_URL}/api/friends/requests`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch friend requests");
      const data = await res.json();
      setIncomingRequests(
        (Array.isArray(data.incoming) ? data.incoming : []) as IncomingRequest[],
      );
      setOutgoingRequests(
        (Array.isArray(data.outgoing) ? data.outgoing : []) as OutgoingRequest[],
      );
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const loadBlockedUsers = useCallback(async () => {
    try {
      setLoadingBlocks(true);
      const res = await fetch(`${API_URL}/api/friends/blocks/list`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch blocked users");
      const data = await res.json();
      const items = (Array.isArray(data.blockedUsers)
        ? data.blockedUsers
        : []) as BlockedUser[];
      setBlockedUsers(items);
    } finally {
      setLoadingBlocks(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadFriends(), loadFriendRequests(), loadBlockedUsers()])
      .then(() => {
        setError(null);
      })
      .catch(() => {
        setError("Failed to load friend data.");
      });
  }, [loadFriends, loadFriendRequests, loadBlockedUsers]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery) return friends;
    const query = searchQuery.toLowerCase();
    return friends.filter((friend) => friend.name.toLowerCase().includes(query));
  }, [friends, searchQuery]);

  const handleRemoveFriend = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/friends/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove friend");
      setFriends((prev) => prev.filter((friend) => friend.id !== id));
      setInfo("Friend removed.");
      setError(null);
    } catch {
      setError("Failed to remove friend.");
    }
  };

  const handleSearchUsers = async () => {
    const query = newFriendName.trim();
    if (!query) return;
    try {
      setSearching(true);
      const res = await fetch(
        `${API_URL}/api/friends/search?q=${encodeURIComponent(query)}`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults((Array.isArray(data.results) ? data.results : []) as SearchResult[]);
      setError(null);
    } catch {
      setError("Search failed. Try again.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSendFriendRequest = async (toUserId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/friends/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toUserId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to send friend request");
      }

      setInfo("Friend request sent.");
      setError(null);
      setSearchResults((prev) => prev.filter((user) => user.id !== toUserId));
      await loadFriendRequests();
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to send friend request.",
      );
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/friends/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestId }),
      });
      if (!res.ok) throw new Error("Failed to accept request");
      setInfo("Friend request accepted.");
      setError(null);
      await Promise.all([loadFriendRequests(), loadFriends()]);
    } catch {
      setError("Failed to accept friend request.");
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/friends/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestId }),
      });
      if (!res.ok) throw new Error("Failed to decline request");
      setInfo("Friend request declined.");
      setError(null);
      await loadFriendRequests();
    } catch {
      setError("Failed to decline friend request.");
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/friends/block/${userId}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to block user");
      }
      setInfo("User blocked.");
      setError(null);
      setSearchResults((prev) => prev.filter((item) => item.id !== userId));
      await Promise.all([loadFriends(), loadFriendRequests(), loadBlockedUsers()]);
    } catch (blockError: unknown) {
      setError(
        blockError instanceof Error ? blockError.message : "Failed to block user.",
      );
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/friends/block/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to unblock user");
      setInfo("User unblocked.");
      setError(null);
      await loadBlockedUsers();
    } catch {
      setError("Failed to unblock user.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white flex transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 ml-72 p-8">
        <header className="flex flex-col gap-4 mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Friends</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Manage friends, requests, and blocked users.
              </p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-300 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-teal-500 transition-colors shadow-sm"
              />
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-red-300/60 dark:border-red-700/60 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-lg border border-teal-300/60 dark:border-teal-700/60 bg-teal-500/10 px-3 py-2 text-sm text-teal-700 dark:text-teal-300">
              {info}
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-6">
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Your Friends</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {friends.length} total
                </p>
              </div>
            </div>

            {loadingFriends ? (
              <div className="py-10 text-center text-gray-500 dark:text-gray-400">
                Loading friends...
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="py-10 text-center text-gray-500 dark:text-gray-400">
                No friends found.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ProfileAvatar
                        name={friend.name}
                        avatar={friend.avatar}
                        onClick={() => navigate(`/u/${friend.id}`)}
                      />
                      <div className="min-w-0">
                        <div
                          className="font-semibold truncate cursor-pointer hover:text-teal-500 dark:hover:text-teal-400 transition-colors"
                          onClick={() => navigate(`/u/${friend.id}`)}
                        >
                          {friend.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Friends since {friend.since || "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/messages?chat=${friend.id}`)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-300 hover:bg-teal-500/20 transition-colors flex items-center gap-1.5"
                        title="Message"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Message
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
                        title="Unfriend"
                      >
                        <UserX className="w-4 h-4" />
                        Unfriend
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-500" />
                Find Users
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Search by username or email and send friend requests.
              </p>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Username or email"
                  value={newFriendName}
                  onChange={(event) => setNewFriendName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSearchUsers();
                    }
                  }}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:border-teal-500 transition-colors"
                />
                <button
                  onClick={() => void handleSearchUsers()}
                  className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-colors disabled:opacity-60"
                  disabled={searching}
                >
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <ProfileAvatar
                            name={result.name}
                            avatar={result.avatar}
                            size="sm"
                            onClick={() => navigate(`/u/${result.id}`)}
                          />
                          <div className="min-w-0">
                            <div
                              className="text-sm font-semibold truncate cursor-pointer hover:text-teal-500 dark:hover:text-teal-400 transition-colors"
                              onClick={() => navigate(`/u/${result.id}`)}
                            >
                              {result.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {result.email || "No email"}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => void handleSendFriendRequest(result.id)}
                          className="flex-1 px-2 py-1.5 rounded-md text-xs font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-colors inline-flex items-center justify-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Request
                        </button>
                        <button
                          onClick={() => void handleBlockUser(result.id)}
                          className="flex-1 px-2 py-1.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors inline-flex items-center justify-center gap-1"
                        >
                          <ShieldBan className="w-3.5 h-3.5" />
                          Block
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Incoming Requests</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {incomingRequests.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {loadingRequests ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Loading requests...
                  </div>
                ) : incomingRequests.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No incoming requests.
                  </div>
                ) : (
                  incomingRequests.map((request) => (
                    <div
                      key={request.requestId}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        <ProfileAvatar
                          name={request.from.name}
                          avatar={request.from.avatar}
                          size="sm"
                          onClick={() => navigate(`/u/${request.from.id}`)}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {request.from.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(request.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => void handleAcceptRequest(request.requestId)}
                          className="flex-1 px-2 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 transition-colors inline-flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept
                        </button>
                        <button
                          onClick={() => void handleDeclineRequest(request.requestId)}
                          className="flex-1 px-2 py-1.5 rounded-md text-xs font-semibold bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors inline-flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Outgoing Requests</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {outgoingRequests.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {loadingRequests ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Loading requests...
                  </div>
                ) : outgoingRequests.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No outgoing requests.
                  </div>
                ) : (
                  outgoingRequests.map((request) => (
                    <div
                      key={request.requestId}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        <ProfileAvatar
                          name={request.to.name}
                          avatar={request.to.avatar}
                          size="sm"
                          onClick={() => navigate(`/u/${request.to.id}`)}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {request.to.name}
                          </div>
                          <div className="text-xs text-amber-600 dark:text-amber-400">
                            Pending
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Blocked Users</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {blockedUsers.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {loadingBlocks ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Loading blocked users...
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No blocked users.
                  </div>
                ) : (
                  blockedUsers.map((blockedUser) => (
                    <div
                      key={blockedUser.id}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <ProfileAvatar
                            name={blockedUser.name}
                            avatar={blockedUser.avatar}
                            size="sm"
                            onClick={() => navigate(`/u/${blockedUser.id}`)}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">
                              {blockedUser.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Blocked on {formatDate(blockedUser.blockedAt)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => void handleUnblockUser(blockedUser.id)}
                          className="px-2 py-1.5 rounded-md text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          Unblock
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
