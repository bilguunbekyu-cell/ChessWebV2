import { useMemo } from "react";
import { Activity, CalendarDays, Gamepad2, TrendingUp, Users } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  ActiveMetricsResponse,
  RetentionMetricsResponse,
  Stats,
} from "./types";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: "teal" | "blue" | "green" | "purple" | "amber" | "rose" | "indigo";
  hint?: string;
}

const colorMap: Record<StatCardProps["color"], string> = {
  teal: "from-teal-500 to-emerald-600",
  blue: "from-blue-500 to-cyan-600",
  green: "from-green-500 to-emerald-600",
  purple: "from-purple-500 to-pink-600",
  amber: "from-amber-500 to-orange-600",
  rose: "from-rose-500 to-pink-600",
  indigo: "from-indigo-500 to-violet-600",
};

export function StatCard({ icon, label, value, color, hint }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorMap[color]} flex items-center justify-center text-white`}
        >
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
          {hint ? (
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface DashboardStatsProps {
  stats: Stats | null;
  activeMetrics: ActiveMetricsResponse | null;
  retentionMetrics: RetentionMetricsResponse | null;
}

export function DashboardStats({
  stats,
  activeMetrics,
  retentionMetrics,
}: DashboardStatsProps) {
  const trendData = useMemo(() => {
    const points = Array.isArray(activeMetrics?.trend) ? activeMetrics!.trend : [];
    return points.map((point) => ({
      ...point,
      label: point.date.slice(5),
      hours: Number((point.timeSpentSec / 3600).toFixed(2)),
    }));
  }, [activeMetrics]);

  const cohortData = useMemo(() => {
    const cohorts = Array.isArray(retentionMetrics?.cohorts)
      ? retentionMetrics!.cohorts
      : [];
    return [...cohorts]
      .reverse()
      .map((cohort) => ({
        ...cohort,
        label: cohort.cohortStart.slice(5),
      }));
  }, [retentionMetrics]);

  const dau = activeMetrics?.summary?.dau ?? 0;
  const wau = activeMetrics?.summary?.wau ?? 0;
  const mau = activeMetrics?.summary?.mau ?? 0;
  const avgDau = activeMetrics?.summary?.avgDau ?? 0;
  const d1 = retentionMetrics?.summary?.d1?.rate ?? 0;
  const d7 = retentionMetrics?.summary?.d7?.rate ?? 0;
  const d30 = retentionMetrics?.summary?.d30?.rate ?? 0;

  return (
    <div className="space-y-4 mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Total Users"
          value={stats?.totalUsers ?? 0}
          color="teal"
        />
        <StatCard
          icon={<Gamepad2 className="w-6 h-6" />}
          label="Total Games"
          value={stats?.totalGames ?? 0}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="New Users (7d)"
          value={stats?.newUsersThisWeek ?? 0}
          color="green"
        />
        <StatCard
          icon={<CalendarDays className="w-6 h-6" />}
          label="Games (7d)"
          value={stats?.gamesThisWeek ?? 0}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="DAU"
          value={dau}
          color="amber"
          hint={`Avg ${avgDau.toFixed(1)} / day`}
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="WAU"
          value={wau}
          color="rose"
          hint={
            activeMetrics?.summary?.comparison?.wauGrowthPercent === null
              ? undefined
              : `${activeMetrics?.summary?.comparison?.wauGrowthPercent}% vs prev`
          }
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="MAU"
          value={mau}
          color="indigo"
          hint={
            activeMetrics?.summary?.comparison?.mauGrowthPercent === null
              ? undefined
              : `${activeMetrics?.summary?.comparison?.mauGrowthPercent}% vs prev`
          }
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Retention (D1 / D7 / D30)"
          value={`${d1.toFixed(1)}% / ${d7.toFixed(1)}% / ${d30.toFixed(1)}%`}
          color="teal"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Active Users Trend (30d)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="label" minTickGap={24} />
                <YAxis yAxisId="users" />
                <YAxis yAxisId="games" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="users"
                  type="monotone"
                  dataKey="dau"
                  name="DAU"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="games"
                  type="monotone"
                  dataKey="gamesPlayed"
                  name="Games"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Cohort Retention (D7 / D30)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cohortData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="label" minTickGap={20} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="d7Rate" name="D7 %" fill="#0ea5e9" />
                <Bar dataKey="d30Rate" name="D30 %" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
