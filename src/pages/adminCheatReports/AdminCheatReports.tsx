import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import { useAdminStore } from "../../store/adminStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

type ReportStatus = "pending" | "reviewed" | "dismissed" | "actioned";
type RiskLevel = "low" | "medium" | "high";
type ReviewAction = "none" | "warn" | "restrict" | "ban";

interface ReportUser {
  _id: string;
  fullName: string;
  email: string;
  avatar?: string;
  banned?: boolean;
}

interface ReportMetrics {
  gamesConsidered: number;
  gamesAnalyzed: number;
  movesAnalyzed: number;
  bestMoveMatchRate: number | null;
  top3MatchRate: number | null;
  avgCentipawnLoss: number;
  nearPerfectMoveRate: number;
  strongMoveRate: number;
  blunderRate: number;
  avgMoveTimeSec: number;
  avgMoveTimeStdSec: number;
  lowVarianceGameRate: number;
  criticalWindowRate: number;
  suspicionScore: number;
  riskLevel: RiskLevel;
}

interface ReportSummary {
  _id: string;
  user: ReportUser | null;
  source: string;
  status: ReportStatus;
  reviewAction: ReviewAction;
  metrics: ReportMetrics;
  flags: string[];
  createdAt: string;
  reviewedAt?: string | null;
}

interface ReportGame {
  _id: string;
  white: string;
  black: string;
  result: string;
  createdAt: string;
  rated: boolean;
  variant: string;
  movesCount: number;
  timeControl: string;
}

interface ReportDetail extends ReportSummary {
  reviewNote: string;
  reviewedBy: string | null;
  dataGaps: {
    bestMoveUnavailable: boolean;
    top3Unavailable: boolean;
    notes: string[];
  };
  games: ReportGame[];
  updatedAt: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

function riskBadge(level: RiskLevel) {
  if (level === "high") return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
  if (level === "medium")
    return "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400";
  return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300";
}

function statusBadge(status: ReportStatus) {
  if (status === "pending")
    return "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400";
  if (status === "actioned")
    return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
  if (status === "dismissed")
    return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300";
  return "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400";
}

function asPercent(value: number) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function AdminCheatReports() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, checkAuth } = useAdminStore();

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [loadingReports, setLoadingReports] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | ReportStatus>("");
  const [riskFilter, setRiskFilter] = useState<"" | RiskLevel>("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const [batchScanning, setBatchScanning] = useState(false);
  const [manualUserId, setManualUserId] = useState("");
  const [manualScanning, setManualScanning] = useState(false);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login");
  }, [isLoading, isAuthenticated, navigate]);

  const fetchReports = useCallback(async () => {
    try {
      setLoadingReports(true);
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (statusFilter) params.set("status", statusFilter);
      if (riskFilter) params.set("riskLevel", riskFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`${API_URL}/api/admin/cheat-reports?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load cheat reports");
      const data = await res.json();
      setReports(Array.isArray(data.reports) ? data.reports : []);
      if (data.pagination) {
        setPagination((prev) => ({
          ...prev,
          page: Number(data.pagination.page || prev.page),
          total: Number(data.pagination.total || 0),
          pages: Number(data.pagination.pages || 1),
        }));
      }
      setError(null);
    } catch {
      setError("Failed to fetch cheat reports.");
    } finally {
      setLoadingReports(false);
    }
  }, [pagination.page, pagination.limit, riskFilter, search, statusFilter]);

  useEffect(() => {
    if (isAuthenticated) void fetchReports();
  }, [isAuthenticated, fetchReports]);

  const loadDetail = useCallback(async (reportId: string) => {
    try {
      setLoadingDetail(true);
      setSelectedId(reportId);
      const res = await fetch(`${API_URL}/api/admin/cheat-reports/${reportId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch report detail");
      const data = await res.json();
      setSelectedReport(data.report || null);
      setReviewNote(data.report?.reviewNote || "");
    } catch {
      setError("Failed to load report detail.");
      setSelectedReport(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const applyReview = useCallback(
    async (action: ReviewAction, status?: ReportStatus) => {
      if (!selectedReport) return;
      try {
        setReviewing(true);
        const res = await fetch(
          `${API_URL}/api/admin/cheat-reports/${selectedReport._id}/review`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              action,
              status,
              note: reviewNote,
            }),
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to review report");

        setSelectedReport(data.report || null);
        setNotice(
          action === "none"
            ? "Report reviewed."
            : `Report action applied: ${action}.`,
        );
        await fetchReports();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to review report.");
      } finally {
        setReviewing(false);
      }
    },
    [fetchReports, reviewNote, selectedReport],
  );

  const runBatchScan = useCallback(async () => {
    try {
      setBatchScanning(true);
      const res = await fetch(`${API_URL}/api/admin/cheat-reports/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ minGames: 10, maxGames: 40, limit: 50 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Batch scan failed");
      setNotice(
        `Batch scan finished. Scanned ${data.scanned || 0}, flagged ${data.flagged || 0}, created ${data.created || 0}.`,
      );
      await fetchReports();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Batch scan failed.");
    } finally {
      setBatchScanning(false);
    }
  }, [fetchReports]);

  const runManualScan = useCallback(async () => {
    const userId = manualUserId.trim();
    if (!userId) {
      setError("Enter a user id to scan.");
      return;
    }
    try {
      setManualScanning(true);
      const res = await fetch(
        `${API_URL}/api/admin/cheat-reports/scan/${encodeURIComponent(userId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ minGames: 10, maxGames: 40 }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Manual scan failed");
      setNotice(
        data.flagged
          ? data.created
            ? "Manual scan flagged user and created a report."
            : "Manual scan flagged user; recent pending report already exists."
          : data.reason || "Manual scan complete; no flag.",
      );
      await fetchReports();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Manual scan failed.");
    } finally {
      setManualScanning(false);
    }
  }, [fetchReports, manualUserId]);

  const topStats = useMemo(() => {
    const pending = reports.filter((r) => r.status === "pending").length;
    const highRisk = reports.filter((r) => r.metrics?.riskLevel === "high").length;
    const actioned = reports.filter((r) => r.status === "actioned").length;
    return { pending, highRisk, actioned };
  }, [reports]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white">
      <AdminSidebar />
      <main className="ml-72 p-8">
        <div className="flex items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-teal-500" />
              Cheat Review Queue
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Flag suspicious patterns and review before taking action.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchReports()}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm inline-flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => void runBatchScan()}
              disabled={batchScanning}
              className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {batchScanning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              Run Batch Scan
            </button>
          </div>
        </div>

        {(error || notice) && (
          <div
            className={`mb-4 px-4 py-2 rounded-lg text-sm ${
              error
                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
            }`}
          >
            {error || notice}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-2xl font-bold mt-1">{topStats.pending}</p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-xs text-gray-500">High Risk</p>
            <p className="text-2xl font-bold mt-1 text-red-500">{topStats.highRisk}</p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-xs text-gray-500">Actioned</p>
            <p className="text-2xl font-bold mt-1">{topStats.actioned}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 mb-5">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by user name/email"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "" | ReportStatus)
              }
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            >
              <option value="">All Status</option>
              <option value="pending">pending</option>
              <option value="reviewed">reviewed</option>
              <option value="dismissed">dismissed</option>
              <option value="actioned">actioned</option>
            </select>
            <select
              value={riskFilter}
              onChange={(event) =>
                setRiskFilter(event.target.value as "" | RiskLevel)
              }
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            >
              <option value="">All Risk</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
            <button
              onClick={() => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                void fetchReports();
              }}
              className="px-3 py-2 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-sm"
            >
              Apply
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={manualUserId}
              onChange={(event) => setManualUserId(event.target.value)}
              placeholder="Manual scan userId"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            />
            <button
              onClick={() => void runManualScan()}
              disabled={manualScanning}
              className="px-3 py-2 rounded-lg border border-teal-500 text-teal-600 dark:text-teal-400 text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {manualScanning && <Loader2 className="w-4 h-4 animate-spin" />}
              Scan User
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          {loadingReports ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-20 text-center text-gray-500 dark:text-gray-400">
              No reports found.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium uppercase">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium uppercase">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium uppercase">
                    Risk
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium uppercase">
                    Flags
                  </th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {reports.map((report) => (
                  <tr
                    key={report._id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${
                      selectedId === report._id ? "bg-teal-50/60 dark:bg-teal-900/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {report.user?.fullName || "Unknown user"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {report.user?.email || "No email"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {report.metrics?.suspicionScore ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${riskBadge(
                          report.metrics?.riskLevel || "low",
                        )}`}
                      >
                        {report.metrics?.riskLevel || "low"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(
                          report.status,
                        )}`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      {report.flags?.[0] || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void loadDetail(report._id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination.pages > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  page: Math.max(1, prev.page - 1),
                }))
              }
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700"
              disabled={pagination.page <= 1}
            >
              Prev
            </button>
            <span className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  page: Math.min(prev.pages, prev.page + 1),
                }))
              }
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700"
              disabled={pagination.page >= pagination.pages}
            >
              Next
            </button>
          </div>
        )}
      </main>

      {(loadingDetail || selectedReport) && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl overflow-y-auto">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Cheat Report Detail</h3>
                {selectedReport && (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedReport.user?.fullName || "Unknown"} • Score{" "}
                    {selectedReport.metrics?.suspicionScore || 0}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedId(null);
                  setSelectedReport(null);
                  setReviewNote("");
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-6 flex items-center gap-3 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading report detail...
              </div>
            ) : selectedReport ? (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                    <p className="text-xs text-gray-500">Risk</p>
                    <p className="font-semibold mt-1">{selectedReport.metrics.riskLevel}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="font-semibold mt-1">{selectedReport.status}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                    <p className="text-xs text-gray-500">Near-perfect rate</p>
                    <p className="font-semibold mt-1">
                      {asPercent(selectedReport.metrics.nearPerfectMoveRate)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                    <p className="text-xs text-gray-500">Avg CPL</p>
                    <p className="font-semibold mt-1">
                      {selectedReport.metrics.avgCentipawnLoss}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                    <p className="text-xs text-gray-500">Low variance games</p>
                    <p className="font-semibold mt-1">
                      {asPercent(selectedReport.metrics.lowVarianceGameRate)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                    <p className="text-xs text-gray-500">Critical window</p>
                    <p className="font-semibold mt-1">
                      {asPercent(selectedReport.metrics.criticalWindowRate)}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Heuristic Flags</h4>
                  {selectedReport.flags.length === 0 ? (
                    <p className="text-sm text-gray-500">No flags.</p>
                  ) : (
                    <ul className="space-y-1">
                      {selectedReport.flags.map((flag, idx) => (
                        <li key={`${flag}-${idx}`} className="text-sm flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500" />
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Review Note</h4>
                  <textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm resize-none"
                  />
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Games ({selectedReport.games.length})</h4>
                  {selectedReport.games.length === 0 ? (
                    <p className="text-sm text-gray-500">No linked games.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedReport.games.map((game) => (
                        <div
                          key={game._id}
                          className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {game.white} vs {game.black} ({game.result})
                            </div>
                            <div className="text-xs text-gray-500">
                              {game.variant} • {game.movesCount} moves •{" "}
                              {formatDate(game.createdAt)}
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(`/admin/analyze/${game._id}`)}
                            className="px-2 py-1 rounded text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20"
                          >
                            Analyze
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void applyReview("none", "dismissed")}
                    disabled={reviewing}
                    className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-60"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => void applyReview("none", "reviewed")}
                    disabled={reviewing}
                    className="px-3 py-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 text-sm font-medium hover:bg-teal-500/20 disabled:opacity-60"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    onClick={() => void applyReview("warn")}
                    disabled={reviewing}
                    className="px-3 py-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium hover:bg-amber-500/20 disabled:opacity-60"
                  >
                    Warn User
                  </button>
                  <button
                    onClick={() => void applyReview("restrict")}
                    disabled={reviewing}
                    className="px-3 py-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm font-medium hover:bg-orange-500/20 disabled:opacity-60"
                  >
                    Restrict (Review)
                  </button>
                  <button
                    onClick={() => void applyReview("ban")}
                    disabled={reviewing}
                    className="col-span-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-60"
                  >
                    Ban User
                  </button>
                </div>

                <div className="text-xs text-gray-500">
                  Created: {formatDate(selectedReport.createdAt)} • Reviewed:{" "}
                  {formatDate(selectedReport.reviewedAt)}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
