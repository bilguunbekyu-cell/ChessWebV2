# NeonGambit Task Split (2026-03-04)

This file separates what is already implemented vs. what can be assigned next to other models.

## 1) Completed in codebase now

### 1.1 Friends / Messaging
- `DONE` friend request flow:
  - `POST /api/friends/request`
  - `POST /api/friends/accept`
  - `POST /api/friends/decline`
  - `GET /api/friends/requests`
- `DONE` block/unblock:
  - `POST /api/friends/block/:userId`
  - `DELETE /api/friends/block/:userId`
  - `GET /api/friends/blocks/list`
- `DONE` non-friend message request flow:
  - send message => `request_pending` for non-friends
  - `GET /api/messages/requests`
  - `POST /api/messages/requests/:userId/accept`
  - `POST /api/messages/requests/:userId/decline`
- `DONE` frontend integration:
  - [Friends.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/friends/Friends.tsx)
  - [Messages.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/messages/Messages.tsx)

### 1.2 Notifications
- `DONE` notification model + user endpoints:
  - `GET /api/notifications`
  - `GET /api/notifications/unread-count`
  - `PATCH /api/notifications/read-all`
  - `PATCH /api/notifications/:id/read`
- `DONE` event delivery support via DB + socket notifier service.
- `DONE` admin broadcast endpoint:
  - `POST /api/admin/notifications/broadcast`
- `DONE` frontend pages:
  - [Notifications.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/notifications/Notifications.tsx)
  - [AdminBroadcast.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminBroadcast/AdminBroadcast.tsx)
  - unread badge in [Sidebar.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/components/Sidebar.tsx)

### 1.3 Feedback System
- `DONE` user feedback submit/list:
  - `POST /api/feedback`
  - `GET /api/feedback/mine`
- `DONE` admin inbox/update:
  - `GET /api/admin/feedback`
  - `PATCH /api/admin/feedback/:id`
- `DONE` frontend:
  - user form in [Settings.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/Settings.tsx)
  - admin inbox in [AdminFeedback.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminFeedback/AdminFeedback.tsx)

### 1.4 News Articles
- `DONE` model + routes:
  - public `GET /api/news`, `GET /api/news/:slug`
  - admin CRUD under `/api/admin/news`
- `DONE` frontend:
  - [NewsList.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/news/NewsList.tsx)
  - [NewsDetail.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/news/NewsDetail.tsx)
  - [AdminNews.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminNews/AdminNews.tsx)
- `DONE` navigation:
  - `/news` added in user sidebar
  - `/admin/news` in admin sidebar

### 1.5 Learn Backend + Interactive MVP
- `DONE` lesson models:
  - [Lesson.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/models/Lesson.js)
  - [LessonProgress.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/models/LessonProgress.js)
- `DONE` user lesson APIs:
  - `GET /api/lessons`
  - `GET /api/lessons/:id`
  - `POST /api/lessons/:id/progress`
  - `POST /api/lessons/:id/validate-move`
- `DONE` admin lesson CRUD APIs:
  - `GET /api/admin/lessons`
  - `GET /api/admin/lessons/:id`
  - `POST /api/admin/lessons`
  - `PUT /api/admin/lessons/:id`
  - `DELETE /api/admin/lessons/:id`
- `DONE` frontend integration:
  - [Learn.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/Learn.tsx) now loads live lessons and supports move validation/progress save
  - [AdminLessons.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminLessons/AdminLessons.tsx) for admin CRUD
  - `/admin/lessons` added to admin sidebar/routes

### 1.6 Admin User Soft Delete
- `DONE` backend soft delete + restore:
  - `DELETE /api/admin/users/:id` (soft delete via `deletedAt`)
  - `PATCH /api/admin/users/:id/restore`
- `DONE` model fields in [User.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/models/User.js)

### 1.7 Leaderboard scope + basic non-functional hardening
- `DONE` friends scope in leaderboard:
  - `GET /api/ratings/leaderboard?pool=blitz&scope=friends`
- `DONE` health endpoint:
  - `GET /healthz`
- `DONE` basic security middleware in server:
  - secure headers
  - auth endpoint rate limiting
  - optional HTTPS redirect via `ENFORCE_HTTPS=true`

### 1.8 Anti-Cheat Flag + Review MVP
- `DONE` anti-cheat model:
  - [CheatReport.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/models/CheatReport.js)
- `DONE` heuristics/scanner service:
  - [cheatDetection.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/services/cheatDetection.js)
  - uses rated history + move-time pattern + estimated CPL/accuracy style heuristics
  - does **flag + review** (no auto-ban)
- `DONE` admin APIs:
  - `GET /api/admin/cheat-reports`
  - `GET /api/admin/cheat-reports/:id`
  - `POST /api/admin/cheat-reports/scan/:userId`
  - `POST /api/admin/cheat-reports/scan`
  - `PATCH /api/admin/cheat-reports/:id/review`
- `DONE` admin UI:
  - [AdminCheatReports.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminCheatReports/AdminCheatReports.tsx)
  - route `/admin/cheat-reports` and sidebar navigation
- `NOTE`
  - `bestMoveMatchRate` / `top3MatchRate` are intentionally `null` until per-ply best-move candidates are persisted in history.

### 1.9 Admin Metrics (DAU/WAU/MAU + Retention)
- `DONE` activity model + tracking:
  - [UserActivity.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/models/UserActivity.js)
  - [activity.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/services/activity.js)
  - tracking wired in auth login/register/me, history save, and puzzle attempt flow
- `DONE` admin metrics APIs:
  - `GET /api/admin/metrics/active?days=30`
  - `GET /api/admin/metrics/retention?days=120`
  - implementation: [adminMetrics.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/adminMetrics.js)
- `DONE` admin dashboard metrics UI:
  - [AdminDashboard.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminDashboard/AdminDashboard.tsx)
  - [DashboardStats.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminDashboard/DashboardStats.tsx)
  - includes DAU/WAU/MAU cards, active trend chart, and cohort retention chart

### 1.10 Tournament Manager Repair Action
- `DONE` manager-only manual pairing repair for current pending round:
  - `POST /api/tournaments/:id/rounds/:round/repair`
  - validates full coverage (every registered player exactly once)
  - blocks duplicate player assignment
  - allows at most one bye
  - blocks rematches by default (opt-in `allowRematch: true`)
  - blocks repair if any game in round already started/finished
- `DONE` utility + tests:
  - [tournamentEngine.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/utils/tournamentEngine.js) `buildManualRoundPairings`
  - [tournamentManualPairings.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/tournamentManualPairings.test.mjs)

### 1.11 Testing Quality Improvements (helpers wired to production code)
- `DONE` extracted shared news input helpers:
  - [newsInput.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/utils/newsInput.js)
  - used in [adminNews.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/adminNews.js)
  - tested in [newsHelpers.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/newsHelpers.test.mjs)
- `DONE` extracted feedback input helpers:
  - [feedbackInput.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/utils/feedbackInput.js)
  - used in [feedback.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/feedback.js)
  - tested in [feedbackInput.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/feedbackInput.test.mjs)

### 1.12 Backup + Monitoring Baseline
- `DONE` database backup automation script:
  - npm command: `npm --prefix server run backup:db`
  - script: [backupMongo.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/scripts/backupMongo.js)
  - retention controls: archive count + retention days
- `DONE` operations runbook:
  - [ops-backup-monitoring.md](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/docs/ops-backup-monitoring.md)
  - includes scheduler setup (cron/Task Scheduler) + `/healthz` monitoring notes
- `DONE` deployment baseline for 24/7 uptime:
  - PM2 config: [ecosystem.config.cjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/ecosystem.config.cjs)
  - Docker server profile: [Dockerfile](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/Dockerfile), [docker-compose.server.yml](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/docker-compose.server.yml)
- `DONE` script-based health alert:
  - npm command: `npm --prefix server run monitor:health`
  - script: [healthCheckNotify.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/scripts/healthCheckNotify.js)
  - webhook alert support for unhealthy state

### 1.13 Leaderboard Scheduled Refresh + Cache
- `DONE` leaderboard cache model:
  - [LeaderboardCache.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/models/LeaderboardCache.js)
- `DONE` cache service + scheduler:
  - [leaderboardCache.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/services/leaderboardCache.js)
  - auto-refresh starts on DB connection (default every 5 min)
  - manual refresh command: `npm --prefix server run cache:leaderboard:refresh`
  - refresh script: [refreshLeaderboardCache.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/scripts/refreshLeaderboardCache.js)
- `DONE` ratings route cache integration:
  - [ratings.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/ratings.js)
  - global leaderboard uses cache when request matches default cache policy
  - friends scope and custom query variants still use live query
- `DONE` admin cache observability/control endpoints:
  - `GET /api/admin/metrics/leaderboard-cache`
  - `POST /api/admin/metrics/leaderboard-cache/refresh`
  - implemented in [adminMetrics.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/adminMetrics.js)
- `DONE` service guard tests:
  - [leaderboardCacheService.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/leaderboardCacheService.test.mjs)

## 2) Suggested next tasks for other models

### 2.1 Tournament Engine Expansion (`NEXT`)
- finalize full Swiss pairing constraints, round scheduling UI, bracket rendering for knockout.
- add admin actions for manual pair correction.
- add tests for edge cases (rematch avoidance, odd player byes, tiebreak consistency).

### 2.2 Testing coverage (`NEXT`)
- backend tests for:
  - auth register/login/logout
  - friend request accept/decline
  - message request accept/decline
  - feedback and news CRUD permissions
- frontend tests for:
  - protected routing
  - friends request UI
  - notifications read actions
  - settings feedback submit flow

### 2.3 Ops & Reliability (`NEXT`)
- wire backup output to offsite storage (S3/Backblaze/GCS).
- add uptime alert integration (UptimeRobot/BetterStack webhook flow).
- optional Redis cache for hot endpoints beyond current DB cache layer.

## 3) Quick verification commands (current baseline)

From repo root:

```bash
npm run build
npm --prefix server run test:tournaments
node --check server/routes/news.js
node --check server/routes/adminNews.js
node --check server/routes/lessons.js
node --check server/routes/adminLessons.js
node --check server/routes/adminCheatReports.js
node --check server/routes/adminMetrics.js
node --check server/routes/friends.js
node --check server/routes/messages.js
node --check server/routes/notifications.js
node --check server/routes/feedback.js
node --check server/routes/adminFeedback.js
```
