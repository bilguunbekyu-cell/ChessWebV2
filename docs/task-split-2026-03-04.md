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

### 1.14 Backend Route Behavior Tests (DB-free endpoint tests)
- `DONE` auth/permission guard route tests:
  - [routeAuthGuards.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/routeAuthGuards.test.mjs)
  - covers unauthorized/non-admin access for admin feedback/news/metrics and feedback auth guard
- `DONE` route behavior tests for feedback/news:
  - [routeBehavior.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/routeBehavior.test.mjs)
  - covers feedback message validation + normalization and admin news creation validation + slug/tag normalization
- `DONE` route behavior tests for friend/message request flow:
  - [routeFriendMessageFlow.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/routeFriendMessageFlow.test.mjs)
  - covers friend request accept/decline and message request accept/decline success/error paths

### 1.15 DB-backed Auth Integration Tests
- `DONE` in-memory Mongo integration tests for auth lifecycle:
  - [authIntegration.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/authIntegration.test.mjs)
  - uses `mongodb-memory-server` for isolated DB test runtime
  - covers:
    - register creates hashed user + session cookie + activity row
    - login -> me -> logout flow
    - login invalid password path
    - register duplicate email path

### 1.16 DB-backed Content Integration Tests (Feedback + News)
- `DONE` in-memory Mongo integration tests for feedback/admin-feedback/news/admin-news lifecycle:
  - [contentIntegration.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/contentIntegration.test.mjs)
  - covers:
    - user submits feedback -> admin lists/reviews -> user sees closed/replied state
    - admin creates draft news -> public hidden
    - admin publishes news -> public visible/detail available
    - admin deletes news -> public detail returns not found

### 1.17 DB-backed Tournament Route Integration Tests
- `DONE` in-memory Mongo integration tests for tournament route lifecycle:
  - [tournamentIntegration.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/tournamentIntegration.test.mjs)
  - covers:
    - rating range registration gate (`ratingMin` / `ratingMax`)
    - create/register/start -> report round results -> auto-advance/finish
    - round repair permissions and guard (cannot repair after game started/completed)
- `DONE` tournament test script now includes integration file:
  - `npm --prefix server run test:tournaments`

### 1.18 Frontend Guard + Settings Feedback Test Coverage
- `DONE` extracted route guards to testable component:
  - [RouteGuards.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/components/routes/RouteGuards.tsx)
  - [RouteGuards.test.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/components/routes/RouteGuards.test.tsx)
  - covers `ProtectedRoute` redirect/render/loading and `PublicRoute` redirect behavior.
- `DONE` extracted settings feedback submit helper and tests:
  - [feedbackApi.ts](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/settings/feedbackApi.ts)
  - [feedbackApi.test.ts](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/settings/feedbackApi.test.ts)
  - [Settings.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/Settings.tsx) now uses shared helper.
- `DONE` settings store save/reset coverage:
  - [settingsStore.test.ts](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/test/settingsStore.test.ts)

### 1.19 Sidebar Row Adjustment (Profile Above Action Row)
- `DONE` bottom sidebar section row order switched so profile block appears above quick-action icon row:
  - [Sidebar.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/components/Sidebar.tsx)

### 1.20 Frontend Friends + Notifications Component Tests
- `DONE` friends page component flow tests:
  - [Friends.test.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/friends/Friends.test.tsx)
  - covers:
    - incoming request accept flow with list refresh
    - user search + send friend request flow
    - blocked user unblock flow
- `DONE` notifications page component action tests:
  - [Notifications.test.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/notifications/Notifications.test.tsx)
  - covers:
    - initial fetch on mount
    - per-item mark-as-read action
    - mark-all-as-read action

### 1.21 Frontend Settings + Admin Feedback Component Interaction Tests
- `DONE` settings feedback modal interaction tests:
  - [Settings.feedbackModal.test.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/settings/Settings.feedbackModal.test.tsx)
  - covers:
    - modal open -> input category/message -> submit success (modal closes + success toast call)
    - submit failure path (error toast call + modal remains open)
- `DONE` admin feedback inbox interaction tests:
  - [AdminFeedback.test.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminFeedback/AdminFeedback.test.tsx)
  - covers:
    - load inbox -> reply text update -> `Reply & Close` PATCH payload/status update
    - `Reopen` PATCH flow for closed item

### 1.22 Tournament Swiss Edge-Case Tests + Admin Broadcast Interaction Tests
- `DONE` Swiss pairing edge-case backend tests:
  - [tournamentSwissEdgeCases.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/tournamentSwissEdgeCases.test.mjs)
  - covers:
    - odd player count gives one bye per round
    - bye is not repeated in consecutive rounds when alternatives exist
    - forced rematch color balancing (white/black swap)
    - rematch fallback when no alternative opponent exists
- `DONE` admin broadcast page interaction tests:
  - [AdminBroadcast.test.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminBroadcast/AdminBroadcast.test.tsx)
  - covers:
    - required title/message validation
    - successful send with trimmed payload and audience selection
    - API error surface path

### 1.23 Tournaments UI Interaction Tests + Manager Permission Integration
- `DONE` tournaments page component interaction tests:
  - [Tournaments.test.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/tournaments/Tournaments.test.tsx)
  - covers:
    - owner manager add/remove action flow
    - repair editor validation (invalid JSON) and valid repair submit payload
- `DONE` manager permission integration coverage in tournament routes:
  - [tournamentIntegration.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/tournamentIntegration.test.mjs)
  - added owner-only + idempotent manager add/remove test
- `DONE` tournament test script includes swiss edge-case file:
  - [server/package.json](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/package.json)
  - `npm --prefix server run test:tournaments`

### 1.24 Anti-Cheat Integration + Admin UI Interaction Tests
- `DONE` admin cheat-report backend integration tests:
  - [adminCheatReportsIntegration.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/adminCheatReportsIntegration.test.mjs)
  - covers:
    - review action `warn` -> report actioned + fair-play notification
    - review action `ban` -> user banned + account-action notification
    - review action `none` without explicit status -> defaults to `reviewed`
- `DONE` admin cheat-reports page interaction tests:
  - [AdminCheatReports.test.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminCheatReports/AdminCheatReports.test.tsx)
  - covers:
    - list load -> detail open -> warn action review payload flow
    - batch scan and manual scan user actions

### 1.25 Ops Script Smoke Tests + Admin Dashboard Metrics UI Tests
- `DONE` backup script smoke tests:
  - [backupMongoScript.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/backupMongoScript.test.mjs)
  - covers:
    - missing `MONGODB_URL` validation failure
    - script success path with fake `mongodump` command
    - backup pruning by max-archive policy
- `DONE` health monitoring script smoke tests:
  - [healthCheckNotifyScript.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/healthCheckNotifyScript.test.mjs)
  - covers:
    - healthy endpoint exit success
    - unhealthy endpoint triggers webhook + non-zero exit
    - request-failure path triggers webhook alert
- `DONE` admin dashboard metrics + filter interaction tests:
  - [AdminDashboard.test.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminDashboard/AdminDashboard.test.tsx)
  - covers:
    - metrics cards and chart sections render from API data
    - users pagination + search filter query behavior (`skip` reset on search)
- `DONE` dashboard pagination accessibility/testability tweak:
  - [DashboardUsersTable.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminDashboard/DashboardUsersTable.tsx)
  - added `aria-label` to previous/next pagination buttons

### 1.26 Broadcast Audience Expansion + Notification Lifecycle Integration
- `DONE` backend admin broadcast audience expansion:
  - [adminNotifications.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/adminNotifications.js)
  - added audiences:
    - `flagged` (users with pending/actioned cheat reports)
    - `tournament_players` (requires `tournamentId`)
  - broadcast payload now includes `tournamentId` when audience is tournament-scoped.
- `DONE` admin broadcast UI support for new audiences:
  - [AdminBroadcast.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminBroadcast/AdminBroadcast.tsx)
  - added audience buttons:
    - Flagged Users
    - Tournament Players
  - added required tournament id input + client-side validation for tournament-scoped broadcast.
- `DONE` backend integration tests for audience targeting + unread lifecycle:
  - [notificationsIntegration.test.mjs](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/tests/notificationsIntegration.test.mjs)
  - covers:
    - flagged audience targeting
    - tournament_players validation and delivery
    - unread-count/read-one/read-all notification lifecycle
- `DONE` frontend admin broadcast interaction test extension:
  - [AdminBroadcast.test.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminBroadcast/AdminBroadcast.test.tsx)
  - covers tournament audience validation + payload shape (`tournamentId`).

### 1.27 Runtime Notification Orchestration Improvements
- `DONE` tournament event notifications (live delivery + inbox persistence):
  - [tournaments.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/tournaments.js)
  - added notification flow for:
    - tournament started
    - round paired / game-ready per player
    - bye round notification
    - tournament finished
    - registration confirmation + manager registration alerts
  - `maybeAdvanceTournament` now supports app-context delivery for auto-advance rounds and auto-finish.
- `DONE` direct-message notification improvement:
  - [messages.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/messages.js)
  - sends `new_message` notification for delivered direct messages when there is no existing unread thread notification from same sender.
- `DONE` news publish push notification:
  - [adminNews.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/adminNews.js)
  - when article transitions to `published`, pushes `news_published` notification to non-deleted users with deep-link to `/news/:slug`.

### 1.28 JWT Auth Hardening (Chapter 3 Alignment)
- `DONE` token utility with JWT sign/verify + legacy token fallback:
  - [authToken.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/utils/authToken.js)
  - supports:
    - user tokens (`authToken`)
    - admin tokens (`adminToken`)
    - backward-compatible decode of legacy JSON cookies
- `DONE` auth middleware switched from raw JSON cookie parsing to verified token parsing:
  - [auth.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/middleware/auth.js)
- `DONE` user/admin login routes now issue signed JWT cookies:
  - [auth.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/auth.js)
  - [admin.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/admin.js)
- `DONE` socket auth path updated to verified user token parsing:
  - [index.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/index.js)
- `DONE` dependency update:
  - `jsonwebtoken` added in server package manifest/lock.

### 1.29 Chapter 3 Active Player Metric Surfaced In Admin UI
- `DONE` admin dashboard now explicitly shows Chapter 3 definition:
  - [DashboardStats.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminDashboard/DashboardStats.tsx)
  - added `Active Players (7d)` card
  - card definition: users who played at least 1 game in last 7 days.
- `DONE` active metrics summary type updated for dashboard consumption:
  - [types.ts](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminDashboard/types.ts)
  - added `weeklyActiveGamers` in `ActiveMetricsSummary`.

### 1.30 Admin Audit Logs (Security Hardening)
- `DONE` admin mutation request audit middleware:
  - [adminAuditLog.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/middleware/adminAuditLog.js)
  - logs admin mutating actions (`POST/PUT/PATCH/DELETE`) with:
    - admin identity
    - method/path/status
    - ip + user agent
    - duration
    - sanitized query/body payload (`[REDACTED]` for secrets)
- `DONE` audit log persistence model:
  - [AdminAuditLog.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/models/AdminAuditLog.js)
- `DONE` admin audit log read endpoint:
  - `GET /api/admin/audit-logs`
  - implementation: [adminAuditLogs.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/adminAuditLogs.js)
  - supports filtering by method/admin/status/date/path.
- `DONE` admin frontend visibility:
  - [AdminAuditLogs.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/pages/adminAuditLogs/AdminAuditLogs.tsx)
  - route `/admin/audit-logs` wired in [App.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/App.tsx)
  - admin sidebar link added in [AdminSidebar.tsx](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/src/components/AdminSidebar.tsx).
- `DONE` server wiring:
  - [index.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/index.js)
  - [routes/index.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/index.js)
  - [models/index.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/models/index.js)

### 1.31 Feedback Encryption At Rest (MVP)
- `DONE` feedback sensitive content encrypted at write-time:
  - [Feedback.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/models/Feedback.js)
  - encrypts `message` and `adminReply` on create/update hooks using field-level encryption utility.
- `DONE` API response compatibility retained with decrypt-on-read:
  - [feedback.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/feedback.js)
  - [adminFeedback.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/routes/adminFeedback.js)
  - existing frontend receives plaintext values unchanged while DB stores ciphertext when encryption key is configured.

### 1.32 CORS/Proxy/HSTS Production Config Hardening
- `DONE` CORS origins now env-driven (`CORS_ORIGINS`) with localhost fallback:
  - [index.js](/c:/Users/User/OneDrive/Desktop/DesignV1/ChessWeb2.8] - Copy/server/index.js)
  - applied to both Express CORS and Socket.IO CORS.
- `DONE` proxy-aware HTTPS enforcement improvements:
  - automatic `trust proxy` setup when `ENFORCE_HTTPS=true` or `TRUST_PROXY` is set.
- `DONE` configurable HSTS:
  - enabled when `ENFORCE_HTTPS=true` or `ENABLE_HSTS=true`
  - optional `HSTS_MAX_AGE_SECONDS`, `HSTS_PRELOAD`.

## 2) Suggested next tasks for other models

### 2.1 Tournament Engine Expansion (`NEXT`)
- finalize full Swiss pairing constraints, round scheduling UI, bracket rendering for knockout.
- add admin actions for manual pair correction.
- add tests for edge cases (rematch avoidance, odd player byes, tiebreak consistency).

### 2.2 Testing coverage (`NEXT`)
- add browser-level smoke tests (Playwright/Cypress) for:
  - feedback submit flow
  - admin cheat report review flow
  - tournament manager repair flow
- extend backend integration tests for:
  - cross-route notification triggers across friend/message/news/tournament event creation

### 2.3 Ops & Reliability (`NEXT`)
- wire backup output to offsite storage (S3/Backblaze/GCS).
- add uptime alert integration (UptimeRobot/BetterStack webhook flow).
- optional Redis cache for hot endpoints beyond current DB cache layer.

## 3) Quick verification commands (current baseline)

From repo root:

```bash
npm run build
npm test -- src/pages/adminDashboard/AdminDashboard.test.tsx
npm test -- src/pages/adminBroadcast/AdminBroadcast.test.tsx
node --test server/tests/backupMongoScript.test.mjs server/tests/healthCheckNotifyScript.test.mjs
node --test server/tests/notificationsIntegration.test.mjs
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
node --check server/routes/adminNotifications.js
node --check server/routes/feedback.js
node --check server/routes/adminFeedback.js
```
