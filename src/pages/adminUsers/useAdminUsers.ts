import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminStore } from "../../store/adminStore";
import { User, SortField, SortOrder, API_URL, LIMIT } from "./types";

export function useAdminUsers() {
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
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    setLoadingUsers(true);
    const params = new URLSearchParams({
      limit: String(LIMIT),
      skip: String(page * LIMIT),
      search: searchQuery,
      sortBy,
      sortOrder,
      includeDeleted: includeDeleted ? "true" : "false",
    });

    fetch(`${API_URL}/api/admin/users?${params}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setTotalUsers(data.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoadingUsers(false));
  }, [isAuthenticated, page, searchQuery, sortBy, sortOrder, includeDeleted]);

  const handleDeleteUser = useCallback(
    async (userId: string) => {
      setDeleting(true);
      try {
        const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (res.ok) {
          if (includeDeleted) {
            // Refresh to get updated deletedAt
            setUsers((prev) =>
              prev.map((u) =>
                u._id === userId
                  ? { ...u, deletedAt: new Date().toISOString() }
                  : u,
              ),
            );
          } else {
            setUsers((prev) => prev.filter((u) => u._id !== userId));
            setTotalUsers((prev) => prev - 1);
          }
        }
      } catch (err) {
        console.error("Delete error:", err);
      } finally {
        setDeleting(false);
        setDeleteConfirm(null);
      }
    },
    [includeDeleted],
  );

  const handleRestoreUser = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/restore`, {
        method: "PATCH",
        credentials: "include",
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, deletedAt: null } : u)),
        );
      }
    } catch (err) {
      console.error("Restore error:", err);
    }
  }, []);

  const handleBanUser = useCallback(
    async (userId: string, shouldBan: boolean, reason: string) => {
      setBanning(true);
      try {
        const res = await fetch(`${API_URL}/api/admin/users/${userId}/ban`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ banned: shouldBan, reason }),
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
    },
    [],
  );

  const handleSort = useCallback((field: SortField) => {
    setSortBy((currentSortBy) => {
      if (currentSortBy === field) {
        setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
        return currentSortBy;
      } else {
        setSortOrder("desc");
        return field;
      }
    });
    setPage(0);
  }, []);

  const exportUsers = useCallback(() => {
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
  }, [users]);

  const totalPages = Math.ceil(totalUsers / LIMIT);

  return {
    users,
    totalUsers,
    searchQuery,
    page,
    loadingUsers,
    deleteConfirm,
    deleting,
    banConfirm,
    banReason,
    banning,
    sortBy,
    sortOrder,
    isLoading,
    totalPages,
    includeDeleted,

    setSearchQuery,
    setPage,
    setDeleteConfirm,
    setBanConfirm,
    setBanReason,
    setIncludeDeleted,

    handleDeleteUser,
    handleRestoreUser,
    handleBanUser,
    handleSort,
    exportUsers,
  };
}
