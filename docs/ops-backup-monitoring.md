# Ops Runbook: Backup + Monitoring

## 1) Database Backup (MongoDB)

### Script
- Command: `npm --prefix server run backup:db`
- File: `server/scripts/backupMongo.js`

### Required env
- `MONGODB_URL` (same DB connection string used by server)

### Optional env
- `MONGO_BACKUP_DIR` (default: `server/backups`)
- `MONGO_BACKUP_MAX_ARCHIVES` (default: `30`)
- `MONGO_BACKUP_RETENTION_DAYS` (default: `30`)

### Example
```bash
MONGODB_URL="mongodb+srv://..." npm --prefix server run backup:db
```

### Behavior
- Runs `mongodump` to a timestamped folder `mongo-YYYY-MM-DD_HH-mm-ss-SSS`.
- Prunes old backups by:
  - max archive count
  - retention days

## 2) Scheduler Setup

### Linux cron (daily at 03:30)
```bash
30 3 * * * cd /path/to/repo && /usr/bin/npm --prefix server run backup:db >> /var/log/neongambit-backup.log 2>&1
```

### Windows Task Scheduler
- Program: `cmd.exe`
- Args:
```text
/c cd /d C:\path\to\repo && npm --prefix server run backup:db >> C:\path\to\backup.log 2>&1
```
- Trigger: Daily (recommended off-peak).

## 3) Monitoring

### Health endpoint
- URL: `GET /healthz`
- Expected healthy response:
  - `status = "ok"`
  - `db = "connected"`

### Suggested monitors
- UptimeRobot / Better Stack / Pingdom
- Check interval: 1 minute
- Alert if:
  - non-200 response
  - response time spike

### Script-based health alert (optional)
- Command: `npm --prefix server run monitor:health`
- File: `server/scripts/healthCheckNotify.js`
- Behavior:
  - exits `0` when healthy
  - exits `1` when unhealthy or request fails
  - optionally posts to webhook
- Optional env:
  - `HEALTHCHECK_URL` (default: `http://127.0.0.1:3001/healthz`)
  - `HEALTHCHECK_TIMEOUT_MS` (default: `5000`)
  - `ALERT_WEBHOOK_URL`
  - `ALERT_WEBHOOK_BEARER`

#### Cron example (every minute)
```bash
* * * * * cd /path/to/repo && /usr/bin/npm --prefix server run monitor:health >> /var/log/neongambit-health.log 2>&1
```

## 4) Production notes
- Keep backups off the app disk when possible (sync to S3/Backblaze/GCS).
- Restrict backup access and encrypt backup storage.
- Test restore flow regularly (`mongorestore`) on a staging database.

## 5) Deployment Profiles

### PM2 (system service style)
- Config file: `server/ecosystem.config.cjs`
- Start:
```bash
cd server
npm run dev:pm2
```
- Stop:
```bash
cd server
npm run stop:pm2
```
- Persist reboot startup:
```bash
pm2 save
pm2 startup
```

### Docker Compose (server only)
- Compose file: `docker-compose.server.yml`
- Start:
```bash
docker compose -f docker-compose.server.yml up -d --build
```
- Stop:
```bash
docker compose -f docker-compose.server.yml down
```
- Logs:
```bash
docker compose -f docker-compose.server.yml logs -f api
```

## 6) Leaderboard Cache Refresh

### Auto scheduler
- Starts automatically when server connects to MongoDB.
- Default refresh interval: 5 minutes.
- Optional env:
  - `LEADERBOARD_CACHE_REFRESH_MS` (set `0` to disable scheduler)
  - `LEADERBOARD_CACHE_TTL_MS` (cache staleness threshold for reads)

### Manual refresh command
```bash
npm --prefix server run cache:leaderboard:refresh
```
