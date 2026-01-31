import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Users,
  Search,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  Calendar,
  Trophy,
  Gamepad2,
  UserPlus,
  Filter,
  Download,
  Ban,
  ShieldOff,
  ShieldAlert,
} from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import AdminSidebar from "../components/AdminSidebar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface User {
  _id: string;
  fullName: string;
  email: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
  createdAt: string;
  banned?: boolean;
  bannedAt?: string;
  banReason?: string;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, checkAuth } = useAdminStore();

  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [banConfirm, setBanConfirm] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banning, setBanning] = useState(false);
  const [sortBy, setSortBy] = useState<"createdAt" | "rating" | "gamesPlayed">(
    "createdAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const LIMIT = 15;

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Fetch users
  useEffect(() => {
    if (!isAuthenticated) return;

    setLoadingUsers(true);
    const params = new URLSearchParams({
      limit: String(LIMIT),
      skip: String(page * LIMIT),
      search: searchQuery,
      sortBy,
      sortOrder,
    });

    fetch(`${API_URL}/api/admin/users?${params}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setTotalUsers(data.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoadingUsers(false));
  }, [isAuthenticated, page, searchQuery, sortBy, sortOrder]);

  const handleDeleteUser = async (userId: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u._id !== userId));
        setTotalUsers((prev) => prev - 1);
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleBanUser = async (userId: string, shouldBan: boolean) => {
    setBanning(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ banned: shouldBan, reason: banReason }),
      });

      if (res.ok) {
        const data = await res.json();
        setUsers((prev) =>
          prev.map((u) =>
            u._id === userId
              ? {
                  ...u,
                  banned: data.user.banned,
                  bannedAt: data.user.bannedAt,
                  banReason: data.user.banReason,
                }
              : u,
          ),
        );
      }
    } catch (err) {
      console.error("Ban error:", err);
    } finally {
      setBanning(false);
      setBanConfirm(null);
      setBanReason("");
    }
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(0);
  };

  const exportUsers = () => {
    const csv = [
      ["Name", "Email", "Rating", "Games Played", "Win Rate", "Joined"],
      ...users.map((u) => [
        u.fullName,
        u.email,
        u.rating,
        u.gamesPlayed,
        u.gamesPlayed > 0
          ? `${Math.round((u.gamesWon / u.gamesPlayed) * 100)}%`
          : "0%",
        new Date(u.createdAt).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  const totalPages = Math.ceil(totalUsers / LIMIT);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white">
      <AdminSidebar />

      <main className="ml-64 p-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Users className="w-7 h-7 text-teal-500" />
              User Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage all registered users on the platform
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportUsers}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <div className="text-xl font-bold">{totalUsers}</div>
                <div className="text-xs text-gray-500">Total Users</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-xl font-bold">
                  {
                    users.filter((u) => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return new Date(u.createdAt) > weekAgo;
                    }).length
                  }
                </div>
                <div className="text-xs text-gray-500">New This Week</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-xl font-bold">
                  {users.filter((u) => u.banned).length}
                </div>
                <div className="text-xs text-gray-500">Banned Users</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-xl font-bold">
                  {users.length > 0
                    ? Math.max(...users.map((u) => u.rating))
                    : 0}
                </div>
                <div className="text-xs text-gray-500">Top Rating</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-xl font-bold">
                  {users.reduce((sum, u) => sum + u.gamesPlayed, 0)}
                </div>
                <div className="text-xs text-gray-500">Total Games</div>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Search by name or email..."
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-teal-500 w-full sm:w-80"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Filter className="w-4 h-4" />
              <span>Sort by:</span>
              <button
                onClick={() => handleSort("createdAt")}
                className={`px-2 py-1 rounded ${sortBy === "createdAt" ? "bg-teal-500/20 text-teal-600" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                Date{" "}
                {sortBy === "createdAt" && (sortOrder === "desc" ? "↓" : "↑")}
              </button>
              <button
                onClick={() => handleSort("rating")}
                className={`px-2 py-1 rounded ${sortBy === "rating" ? "bg-teal-500/20 text-teal-600" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                Rating{" "}
                {sortBy === "rating" && (sortOrder === "desc" ? "↓" : "↑")}
              </button>
              <button
                onClick={() => handleSort("gamesPlayed")}
                className={`px-2 py-1 rounded ${sortBy === "gamesPlayed" ? "bg-teal-500/20 text-teal-600" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                Games{" "}
                {sortBy === "gamesPlayed" && (sortOrder === "desc" ? "↓" : "↑")}
              </button>
            </div>
          </div>

          {loadingUsers ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No users found</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-teal-500 hover:underline text-sm"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      User
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => handleSort("rating")}
                        className="hover:text-teal-500"
                      >
                        Rating
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => handleSort("gamesPlayed")}
                        className="hover:text-teal-500"
                      >
                        Games
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      W/L/D
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Win Rate
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => handleSort("createdAt")}
                        className="hover:text-teal-500"
                      >
                        Joined
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {users.map((user) => {
                    const winRate =
                      user.gamesPlayed > 0
                        ? Math.round((user.gamesWon / user.gamesPlayed) * 100)
                        : 0;
                    return (
                      <tr
                        key={user._id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                              {user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {user.fullName}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-mono font-semibold text-gray-900 dark:text-white">
                            {user.rating}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-900 dark:text-white">
                          {user.gamesPlayed}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm">
                            <span className="text-green-500">
                              {user.gamesWon || 0}
                            </span>
                            {" / "}
                            <span className="text-red-500">
                              {user.gamesLost || 0}
                            </span>
                            {" / "}
                            <span className="text-gray-500">
                              {user.gamesDraw || 0}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-500 rounded-full"
                                style={{ width: `${winRate}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {winRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {user.banned ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-medium">
                                <Ban className="w-3 h-3" />
                                Banned
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {deleteConfirm === user._id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                disabled={deleting}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
                              >
                                {deleting ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Delete"
                                )}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : banConfirm === user._id ? (
                            <div className="flex flex-col items-end gap-2">
                              {!user.banned && (
                                <input
                                  type="text"
                                  value={banReason}
                                  onChange={(e) => setBanReason(e.target.value)}
                                  placeholder="Ban reason (optional)"
                                  className="w-48 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-teal-500"
                                />
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    handleBanUser(user._id, !user.banned)
                                  }
                                  disabled={banning}
                                  className={`px-3 py-1.5 ${user.banned ? "bg-green-600 hover:bg-green-500" : "bg-orange-600 hover:bg-orange-500"} text-white rounded-lg text-sm disabled:opacity-50 transition-colors`}
                                >
                                  {banning ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : user.banned ? (
                                    "Unban"
                                  ) : (
                                    "Ban"
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setBanConfirm(null);
                                    setBanReason("");
                                  }}
                                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                to={`/admin/users/${user._id}`}
                                className="p-2 text-gray-400 hover:text-teal-500 hover:bg-teal-100 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                                title="View profile"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => setBanConfirm(user._id)}
                                className={`p-2 rounded-lg transition-colors ${user.banned ? "text-green-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20" : "text-orange-400 hover:text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/20"}`}
                                title={user.banned ? "Unban user" : "Ban user"}
                              >
                                {user.banned ? (
                                  <ShieldOff className="w-4 h-4" />
                                ) : (
                                  <Ban className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(user._id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Showing {page * LIMIT + 1} -{" "}
                {Math.min((page + 1) * LIMIT, totalUsers)} of {totalUsers} users
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  First
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300 px-2">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
