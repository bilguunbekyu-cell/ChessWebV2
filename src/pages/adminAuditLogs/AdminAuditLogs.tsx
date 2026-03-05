import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Loader2, RefreshCw } from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import { useAdminStore } from "../../store/adminStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const PAGE_SIZE = 25;
const METHOD_OPTIONS = ["", "POST", "PUT", "PATCH", "DELETE"] as const;

interface AuditLogRow {
  _id: string;
  admin: {
    _id: string;
    email: string;
    username: string;
  };
  method: string;
  path: string;
  statusCode: number;
  ip: string;
  userAgent: string;
  durationMs: number;
  query: unknown;
  requestBody: unknown;
  createdAt: string;
}

interface AuditResponse {
  logs?: AuditLogRow[];
  total?: number;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString();
}

function methodClassName(method: string) {
  switch (method) {
    case "POST":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
    case "PUT":
      return "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300";
    case "PATCH":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-300";
    case "DELETE":
      return "bg-red-500/15 text-red-700 dark:text-red-300";
    default:
      return "bg-gray-500/15 text-gray-700 dark:text-gray-300";
  }
}

export default function AdminAuditLogs() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, checkAuth } = useAdminStore();

  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] =
    useState<(typeof METHOD_OPTIONS)[number]>("");
  const [pathFilter, setPathFilter] = useState("");
  const [statusFrom, setStatusFrom] = useState("");
  const [statusTo, setStatusTo] = useState("");
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("skip", String(skip));
    if (methodFilter) params.set("method", methodFilter);
    if (pathFilter.trim()) params.set("path", pathFilter.trim());
    if (statusFrom.trim()) params.set("statusFrom", statusFrom.trim());
    if (statusTo.trim()) params.set("statusTo", statusTo.trim());
    return params.toString();
  }, [methodFilter, pathFilter, skip, statusFrom, statusTo]);

  const loadLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch(`${API_URL}/api/admin/audit-logs?${queryString}`, {
        credentials: "include",
      });
      const data = (await res.json()) as AuditResponse;
      if (!res.ok) {
        throw new Error(
          typeof (data as { error?: string }).error === "string"
            ? (data as { error?: string }).error
            : "Failed to load audit logs",
        );
      }
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setTotal(Number.isFinite(Number(data.total)) ? Number(data.total) : 0);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load audit logs.";
      setError(message);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, [queryString]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadLogs();
  }, [isAuthenticated, loadLogs]);

  const hasPrev = skip > 0;
  const hasNext = skip + logs.length < total;

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
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-teal-500" />
              Admin Audit Logs
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Security trail for admin write actions.
            </p>
          </div>
          <button
            onClick={() => void loadLogs()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 grid grid-cols-1 lg:grid-cols-4 gap-3">
          <label className="text-sm">
            <span className="block mb-1 text-gray-500 dark:text-gray-400">
              Method
            </span>
            <select
              value={methodFilter}
              onChange={(event) => {
                setSkip(0);
                setMethodFilter(
                  event.target.value as (typeof METHOD_OPTIONS)[number],
                );
              }}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
            >
              {METHOD_OPTIONS.map((option) => (
                <option key={option || "all"} value={option}>
                  {option || "All"}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm lg:col-span-2">
            <span className="block mb-1 text-gray-500 dark:text-gray-400">
              Path contains
            </span>
            <input
              value={pathFilter}
              onChange={(event) => {
                setSkip(0);
                setPathFilter(event.target.value);
              }}
              placeholder="/api/admin/news"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              <span className="block mb-1 text-gray-500 dark:text-gray-400">
                Status from
              </span>
              <input
                value={statusFrom}
                onChange={(event) => {
                  setSkip(0);
                  setStatusFrom(event.target.value.replace(/[^0-9]/g, ""));
                }}
                maxLength={3}
                placeholder="200"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="block mb-1 text-gray-500 dark:text-gray-400">
                Status to
              </span>
              <input
                value={statusTo}
                onChange={(event) => {
                  setSkip(0);
                  setStatusTo(event.target.value.replace(/[^0-9]/g, ""));
                }}
                maxLength={3}
                placeholder="599"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300/60 dark:border-red-700/60 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          {loadingLogs ? (
            <div className="p-10 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
              No audit logs found for current filters.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {logs.map((row) => (
                <div key={row._id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-1 rounded-full font-semibold ${methodClassName(row.method)}`}
                    >
                      {row.method}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {row.statusCode}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatDateTime(row.createdAt)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {row.durationMs}ms
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {row.admin.username || row.admin.email || "Admin"}
                    </span>
                  </div>

                  <div className="mt-2 text-sm font-medium break-all">{row.path}</div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    IP: {row.ip || "N/A"} | UA: {row.userAgent || "N/A"}
                  </div>

                  <details className="mt-3 text-xs">
                    <summary className="cursor-pointer text-teal-600 dark:text-teal-400">
                      Payload details
                    </summary>
                    <div className="mt-2 grid grid-cols-1 xl:grid-cols-2 gap-3">
                      <pre className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(row.query ?? null, null, 2)}
                      </pre>
                      <pre className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(row.requestBody ?? null, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            Showing {logs.length === 0 ? 0 : skip + 1}-
            {Math.min(skip + logs.length, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSkip((prev) => Math.max(0, prev - PAGE_SIZE))}
              disabled={!hasPrev || loadingLogs}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setSkip((prev) => prev + PAGE_SIZE)}
              disabled={!hasNext || loadingLogs}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
