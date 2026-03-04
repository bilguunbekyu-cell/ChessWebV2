import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

type TournamentType = "swiss" | "roundRobin" | "knockout";
type TournamentStatus = "draft" | "registering" | "running" | "finished";

interface TournamentSummary {
  id: string;
  name: string;
  type: TournamentType;
  status: TournamentStatus;
  timeControl: { baseMs: number; incMs: number; label?: string };
  registeredCount: number;
  isRegistered: boolean;
}

function timeControlLabel(value?: {
  baseMs?: number;
  incMs?: number;
  label?: string;
}) {
  if (!value) return "3+0";
  if (value.label) return value.label;
  const minutes = Math.max(1, Math.round(Number(value.baseMs || 180000) / 60000));
  const increment = Math.max(0, Math.round(Number(value.incMs || 0) / 1000));
  return `${minutes}+${increment}`;
}

function formatType(type: TournamentType) {
  if (type === "roundRobin") return "Round-robin";
  if (type === "knockout") return "Knockout";
  return "Swiss";
}

function statusLabel(status: TournamentStatus, tr: (value: string) => string) {
  if (status === "registering") return tr("Open registration");
  if (status === "running") return tr("Live Now");
  if (status === "finished") return tr("Finish");
  return tr("Open registration");
}

export function TournamentsSection() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tr = (value: string) => t(value, { defaultValue: value });
  const [items, setItems] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string>("");
  const [error, setError] = useState<string>("");

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/tournaments?limit=12`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load tournaments");
      const data = await res.json();
      setItems(Array.isArray(data?.tournaments) ? data.tournaments : []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tournaments",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTournaments();
  }, []);

  const visibleItems = useMemo(() => {
    const active = items.filter(
      (item) => item.status === "registering" || item.status === "running",
    );
    if (active.length > 0) return active.slice(0, 2);
    return items.slice(0, 2);
  }, [items]);

  const handleAction = async (tournament: TournamentSummary) => {
    if (tournament.status === "registering") {
      const endpoint = tournament.isRegistered ? "unregister" : "register";
      try {
        setBusyId(tournament.id);
        const res = await fetch(
          `${API_URL}/api/tournaments/${tournament.id}/${endpoint}`,
          {
            method: "POST",
            credentials: "include",
          },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to update tournament");
        }
        await loadTournaments();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update tournament",
        );
      } finally {
        setBusyId("");
      }
      return;
    }

    navigate("/tournaments");
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="rounded-lg p-4 border border-gray-200 dark:border-gray-800/40 bg-gray-50 dark:bg-gray-900/30 animate-pulse"
          >
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
            <div className="h-3 w-44 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!visibleItems.length) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {tr("No tournaments yet.")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleItems.map((item, index) => {
          const isPrimary = index % 2 === 0;
          const wrapperClass = isPrimary
            ? "bg-gradient-to-br from-amber-50 dark:from-amber-900/15 to-orange-50 dark:to-olive-900/10 border-amber-200 dark:border-amber-800/30"
            : "bg-gradient-to-br from-slate-50 dark:from-slate-900/25 to-blue-50 dark:to-blue-900/20 border-slate-200 dark:border-slate-800/40";
          const titleClass = isPrimary
            ? "text-amber-700 dark:text-amber-300"
            : "text-blue-700 dark:text-blue-300";
          const buttonClass = isPrimary
            ? "bg-amber-600 hover:bg-amber-500"
            : "bg-blue-600 hover:bg-blue-500";

          return (
            <div
              key={item.id}
              className={`rounded-lg p-4 border ${wrapperClass}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${titleClass}`}>
                  {item.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {statusLabel(item.status, tr)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {timeControlLabel(item.timeControl)} {formatType(item.type)}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.registeredCount} {tr("Registered")}
                </span>
                <button
                  type="button"
                  onClick={() => void handleAction(item)}
                  disabled={busyId === item.id}
                  className={`px-3 py-1 ${buttonClass} text-white text-xs rounded-md transition-colors disabled:opacity-60`}
                >
                  {busyId === item.id
                    ? tr("Loading...")
                    : item.status === "registering"
                      ? item.isRegistered
                        ? tr("Unregister")
                        : tr("Register")
                      : tr("Browse All")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {error && (
        <div className="text-xs text-red-600 dark:text-red-300">{error}</div>
      )}
    </div>
  );
}

