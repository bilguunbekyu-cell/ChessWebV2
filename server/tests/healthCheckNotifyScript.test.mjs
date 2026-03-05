import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import process from "node:process";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, "../scripts/healthCheckNotify.js");

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

test("healthCheckNotify exits 0 when health endpoint is healthy", async () => {
  const { server, baseUrl } = await startServer((req, res) => {
    if (req.url === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", db: "connected" }));
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  try {
    const result = await runNodeScript(scriptPath, {
      cwd: path.resolve(__dirname, ".."),
      env: {
        ...process.env,
        HEALTHCHECK_URL: `${baseUrl}/healthz`,
        HEALTHCHECK_TIMEOUT_MS: "1000",
      },
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /\[health-check\] healthy/i);
  } finally {
    await closeServer(server);
  }
});

test(
  "healthCheckNotify sends webhook and exits non-zero when health endpoint is unhealthy",
  async () => {
  const webhookCalls = [];
  const { server, baseUrl } = await startServer(async (req, res) => {
    if (req.url === "/healthz") {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "degraded", db: "disconnected" }));
      return;
    }

    if (req.url === "/hook" && req.method === "POST") {
      const bodyText = await readBody(req);
      webhookCalls.push({
        headers: req.headers,
        body: bodyText ? JSON.parse(bodyText) : null,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  try {
    const result = await runNodeScript(scriptPath, {
      cwd: path.resolve(__dirname, ".."),
      env: {
        ...process.env,
        HEALTHCHECK_URL: `${baseUrl}/healthz`,
        HEALTHCHECK_TIMEOUT_MS: "1000",
        ALERT_WEBHOOK_URL: `${baseUrl}/hook`,
        ALERT_WEBHOOK_BEARER: "token-123",
      },
    });

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /\[health-check\] unhealthy/i);
    assert.equal(webhookCalls.length, 1);
    assert.equal(webhookCalls[0].headers.authorization, "Bearer token-123");
    assert.equal(webhookCalls[0].body.level, "error");
    assert.equal(webhookCalls[0].body.healthPayload.status, "degraded");
  } finally {
    await closeServer(server);
  }
  },
);

test("healthCheckNotify sends webhook on request failure", async () => {
  const webhookCalls = [];
  const { server, baseUrl } = await startServer(async (req, res) => {
    if (req.url === "/hook" && req.method === "POST") {
      const bodyText = await readBody(req);
      webhookCalls.push(bodyText ? JSON.parse(bodyText) : null);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  try {
    const result = await runNodeScript(scriptPath, {
      cwd: path.resolve(__dirname, ".."),
      env: {
        ...process.env,
        HEALTHCHECK_URL: "http://127.0.0.1:1/healthz",
        HEALTHCHECK_TIMEOUT_MS: "300",
        ALERT_WEBHOOK_URL: `${baseUrl}/hook`,
      },
    });

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /\[health-check\] request failed/i);
    assert.equal(webhookCalls.length, 1);
    assert.match(String(webhookCalls[0]?.message || ""), /request failed/i);
  } finally {
    await closeServer(server);
  }
});
