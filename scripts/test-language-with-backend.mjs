import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const serverDir = path.join(rootDir, "server");

const API_URL = process.env.API_URL || "http://localhost:3001";
const STARTUP_TIMEOUT_MS = 30000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerUp() {
  try {
    const res = await fetch(`${API_URL}/api/bots`);
    return res.ok || res.status >= 400;
  } catch {
    return false;
  }
}

async function run() {
  const alreadyRunning = await isServerUp();
  if (alreadyRunning) {
    console.log(`Server already reachable at ${API_URL}. Running language test only...`);
    const testCode = await runNodeScript("scripts/test-language-persistence.mjs");
    process.exit(testCode);
  }

  console.log(`Starting backend from ${serverDir} ...`);
  const server = spawn("node", ["index.js"], {
    cwd: serverDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  let startupResolved = false;
  let startupFailed = false;

  const startupPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (!startupResolved) {
        startupFailed = true;
        reject(new Error(`Server did not start within ${STARTUP_TIMEOUT_MS}ms`));
      }
    }, STARTUP_TIMEOUT_MS);

    const onReady = (line) => {
      if (startupResolved || startupFailed) return;
      if (/Server running on http:\/\/localhost:3001/i.test(line)) {
        startupResolved = true;
        clearTimeout(timeout);
        resolve();
      }
      if (/MongoDB connection error|MONGODB_URL is not defined/i.test(line)) {
        startupFailed = true;
        clearTimeout(timeout);
        reject(new Error(`Backend startup failed: ${line.trim()}`));
      }
    };

    server.stdout.on("data", (chunk) => {
      const text = String(chunk);
      process.stdout.write(`[server] ${text}`);
      text.split(/\r?\n/).forEach(onReady);
    });
    server.stderr.on("data", (chunk) => {
      const text = String(chunk);
      process.stderr.write(`[server] ${text}`);
      text.split(/\r?\n/).forEach(onReady);
    });
    server.on("exit", (code) => {
      if (!startupResolved) {
        clearTimeout(timeout);
        reject(new Error(`Backend exited before ready (code ${code ?? "null"})`));
      }
    });
  });

  try {
    await startupPromise;
    await wait(500);
    const testCode = await runNodeScript("scripts/test-language-persistence.mjs");
    process.exitCode = testCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    if (!server.killed) {
      server.kill("SIGTERM");
      await wait(600);
    }
  }
}

function runNodeScript(relativePath) {
  return new Promise((resolve) => {
    const child = spawn("node", [relativePath], {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
