export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
export const LIMIT = 10;

export interface User {
  _id: string;
  fullName: string;
  email: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: string;
}

export interface Stats {
  totalUsers: number;
  totalGames: number;
  newUsersThisWeek: number;
  gamesThisWeek: number;
}

export interface ActiveMetricsSummary {
  dau: number;
  wau: number;
  mau: number;
  weeklyActiveGamers?: number;
  avgDau: number;
  windowDays: number;
  comparison?: {
    prevWau: number;
    prevMau: number;
    wauGrowthPercent: number | null;
    mauGrowthPercent: number | null;
  };
}

export interface ActiveTrendPoint {
  date: string;
  dau: number;
  gamesPlayed: number;
  timeSpentSec: number;
  loginCount: number;
  puzzlesAttempted: number;
}

export interface ActiveMetricsResponse {
  summary: ActiveMetricsSummary;
  trend: ActiveTrendPoint[];
  topUsers: Array<{
    _id: string;
    user: {
      _id: string;
      fullName: string;
      email: string;
      avatar: string;
      banned: boolean;
    } | null;
    eventCount: number;
    gamesPlayed: number;
    timeSpentSec: number;
    loginCount: number;
    puzzlesAttempted: number;
    lastSeenAt: string | null;
  }>;
}

export interface RetentionPoint {
  cohortStart: string;
  size: number;
  d7Eligible: number;
  d7Retained: number;
  d7Rate: number;
  d30Eligible: number;
  d30Retained: number;
  d30Rate: number;
}

export interface RetentionSummaryValue {
  eligible: number;
  retained: number;
  rate: number;
}

export interface RetentionMetricsResponse {
  summary: {
    usersConsidered: number;
    d1: RetentionSummaryValue;
    d7: RetentionSummaryValue;
    d30: RetentionSummaryValue;
  };
  cohorts: RetentionPoint[];
}
