import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, "../scripts/backupMongo.js");

function runNodeScript(script, { cwd, env, args = [] }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      resolve({
        code: -1,
        stdout,
        stderr: `${stderr}\n${error?.message || error}`.trim(),
      });
    });

    child.on("close", (code) => {
      resolve({
        code: Number.isInteger(code) ? code : -1,
        stdout,
        stderr,
      });
    });
  });
}

async function createFakeMongodump(binDir) {
  if (process.platform === "win32") {
    const filePath = path.join(binDir, "mongodump.cmd");
    const content = [
      "@echo off",
      "setlocal",
      'set "OUT="',
      ":loop",
      'if "%~1"=="" goto done',
      'if /I "%~1"=="--out" (',
      '  set "OUT=%~2"',
      "  shift",
      "  shift",
      "  goto loop",
      ")",
      "shift",
      "goto loop",
      ":done",
      'if "%OUT%"=="" exit /b 1',
      'if not exist "%OUT%" mkdir "%OUT%"',
      'echo dump>"%OUT%\\dump.txt"',
      "exit /b 0",
      "",
    ].join("\r\n");
    await fs.writeFile(filePath, content, "utf8");
    return filePath;
  }

  const filePath = path.join(binDir, "mongodump");
  const content = [
    "#!/usr/bin/env sh",
    "OUT=\"\"",
    "while [ \"$#\" -gt 0 ]; do",
    "  if [ \"$1\" = \"--out\" ]; then",
    "    OUT=\"$2\"",
    "    shift 2",
    "    continue",
    "  fi",
    "  shift",
    "done",
    "if [ -z \"$OUT\" ]; then",
    "  exit 1",
    "fi",
    "mkdir -p \"$OUT\"",
    "echo dump > \"$OUT/dump.txt\"",
    "exit 0",
    "",
  ].join("\n");
  await fs.writeFile(filePath, content, { encoding: "utf8", mode: 0o755 });
  await fs.chmod(filePath, 0o755);
  return filePath;
}

async function listBackupDirs(backupRoot) {
  const entries = await fs.readdir(backupRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("mongo-"))
    .map((entry) => path.join(backupRoot, entry.name));
}

test("backupMongo script fails when MONGODB_URL is missing", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ng-backup-test-"));
  try {
    const result = await runNodeScript(scriptPath, {
      cwd: tempRoot,
      env: {
        ...process.env,
        MONGODB_URL: "",
      },
    });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /MONGODB_URL is required/i);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("backupMongo script runs with fake mongodump and prunes old archives", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ng-backup-test-"));
  const backupRoot = path.join(tempRoot, "backups");
  const fakeBin = path.join(tempRoot, "fake-bin");

  await fs.mkdir(fakeBin, { recursive: true });
  await fs.mkdir(backupRoot, { recursive: true });
  await createFakeMongodump(fakeBin);

  const old1 = path.join(backupRoot, "mongo-2020-01-01_00-00-00");
  const old2 = path.join(backupRoot, "mongo-2020-01-02_00-00-00");
  await fs.mkdir(old1, { recursive: true });
  await fs.mkdir(old2, { recursive: true });
  const oldDate = new Date("2020-01-01T00:00:00.000Z");
  await fs.utimes(old1, oldDate, oldDate);
  await fs.utimes(old2, oldDate, oldDate);

  try {
    const result = await runNodeScript(scriptPath, {
      cwd: tempRoot,
      env: {
        ...process.env,
        MONGODB_URL: "mongodb://127.0.0.1:27017/neongambit_test",
        MONGO_BACKUP_DIR: "backups",
        MONGO_BACKUP_MAX_ARCHIVES: "1",
        MONGO_BACKUP_RETENTION_DAYS: "3650",
        PATH: [fakeBin, process.env.PATH || ""].join(path.delimiter),
      },
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /\[backup\] mongodump completed/i);

    const remaining = await listBackupDirs(backupRoot);
    assert.equal(remaining.length, 1);
    const dumpFile = path.join(remaining[0], "dump.txt");
    const dumpExists = await fs
      .access(dumpFile)
      .then(() => true)
      .catch(() => false);
    assert.equal(dumpExists, true);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
