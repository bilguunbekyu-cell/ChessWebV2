import fs from "fs/promises";
import path from "path";
import process from "process";
import { spawn } from "child_process";

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function formatTimestamp(date = new Date()) {
  return date
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function listBackupDirectories(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const folders = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("mongo-"))
    .map((entry) => path.join(rootDir, entry.name));

  const withStats = await Promise.all(
    folders.map(async (folder) => {
      const stat = await fs.stat(folder);
      return { folder, mtimeMs: stat.mtimeMs };
    }),
  );

  return withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

async function pruneBackups(rootDir, maxBackups, retentionDays) {
  const backups = await listBackupDirectories(rootDir);
  const nowMs = Date.now();
  const retentionMs = retentionDays > 0 ? retentionDays * 24 * 60 * 60 * 1000 : 0;

  const toDelete = [];
  for (let i = 0; i < backups.length; i += 1) {
    const item = backups[i];
    const tooMany = i >= maxBackups;
    const tooOld = retentionMs > 0 && nowMs - item.mtimeMs > retentionMs;
    if (tooMany || tooOld) {
      toDelete.push(item.folder);
    }
  }

  for (const folder of toDelete) {
    await fs.rm(folder, { recursive: true, force: true });
    console.log(`[backup] deleted old backup: ${folder}`);
  }

  return { total: backups.length, deleted: toDelete.length };
}

async function runMongodump({ uri, outDir }) {
  return new Promise((resolve, reject) => {
    const command = "mongodump";
    const args = ["--uri", uri, "--out", outDir];
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", (error) => {
      reject(error);
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`mongodump exited with code ${code}`));
    });
  });
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Usage: node scripts/backupMongo.js");
    console.log("Env:");
    console.log("  MONGODB_URL=...                     (required)");
    console.log("  MONGO_BACKUP_DIR=./server/backups  (optional)");
    console.log("  MONGO_BACKUP_MAX_ARCHIVES=30        (optional)");
    console.log("  MONGO_BACKUP_RETENTION_DAYS=30      (optional)");
    process.exit(0);
  }

  const uri = String(process.env.MONGODB_URL || "").trim();
  if (!uri) {
    console.error("[backup] MONGODB_URL is required");
    process.exit(1);
  }

  const backupRoot = path.resolve(
    process.cwd(),
    process.env.MONGO_BACKUP_DIR || "server/backups",
  );
  const maxBackups = toPositiveInt(process.env.MONGO_BACKUP_MAX_ARCHIVES, 30);
  const retentionDays = toPositiveInt(process.env.MONGO_BACKUP_RETENTION_DAYS, 30);
  const target = path.join(backupRoot, `mongo-${formatTimestamp()}`);

  console.log(`[backup] target: ${target}`);
  await ensureDirectory(backupRoot);

  await runMongodump({ uri, outDir: target });
  console.log("[backup] mongodump completed");

  const pruneResult = await pruneBackups(backupRoot, maxBackups, retentionDays);
  console.log(
    `[backup] backups total=${pruneResult.total}, deleted=${pruneResult.deleted}`,
  );
}

main().catch((error) => {
  console.error("[backup] failed:", error?.message || error);
  process.exit(1);
});
