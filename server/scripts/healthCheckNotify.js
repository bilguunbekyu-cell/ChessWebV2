import process from "process";

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function evaluateHealth(statusCode, payload) {
  const isOkStatus = statusCode >= 200 && statusCode < 300;
  const appStatus = String(payload?.status || "").toLowerCase();
  const dbStatus = String(payload?.db || "").toLowerCase();
  const healthy = isOkStatus && appStatus === "ok" && dbStatus === "connected";
  return {
    healthy,
    appStatus,
    dbStatus,
    statusCode,
  };
}

async function sendWebhookAlert(webhookUrl, bearerToken, payload) {
  if (!webhookUrl) return;
  const headers = { "Content-Type": "application/json" };
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook responded with HTTP ${response.status}`);
  }
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Usage: node scripts/healthCheckNotify.js");
    console.log("Env:");
    console.log("  HEALTHCHECK_URL=http://127.0.0.1:3001/healthz (optional)");
    console.log("  HEALTHCHECK_TIMEOUT_MS=5000                      (optional)");
    console.log("  ALERT_WEBHOOK_URL=https://...                    (optional)");
    console.log("  ALERT_WEBHOOK_BEARER=token                       (optional)");
    console.log("Exit code 0 = healthy, 1 = unhealthy/error");
    process.exit(0);
  }

  const healthUrl =
    process.env.HEALTHCHECK_URL || "http://127.0.0.1:3001/healthz";
  const timeoutMs = toPositiveInt(process.env.HEALTHCHECK_TIMEOUT_MS, 5000);
  const webhookUrl = String(process.env.ALERT_WEBHOOK_URL || "").trim();
  const webhookBearer = String(process.env.ALERT_WEBHOOK_BEARER || "").trim();

  let response;
  let payload = null;

  try {
    response = await fetchWithTimeout(healthUrl, timeoutMs);
    payload = await response.json().catch(() => null);
  } catch (error) {
    const message = `[health-check] request failed: ${error?.message || error}`;
    console.error(message);

    if (webhookUrl) {
      await sendWebhookAlert(webhookUrl, webhookBearer, {
        level: "error",
        source: "neongambit-healthcheck",
        url: healthUrl,
        message,
        timestamp: new Date().toISOString(),
      }).catch((webhookError) => {
        console.error(
          `[health-check] webhook failed: ${webhookError?.message || webhookError}`,
        );
      });
    }
    process.exit(1);
  }

  const result = evaluateHealth(response.status, payload);
  if (result.healthy) {
    console.log(
      `[health-check] healthy (${result.statusCode}) app=${result.appStatus} db=${result.dbStatus}`,
    );
    process.exit(0);
  }

  const message = `[health-check] unhealthy (${result.statusCode}) app=${result.appStatus || "unknown"} db=${result.dbStatus || "unknown"}`;
  console.error(message);

  if (webhookUrl) {
    await sendWebhookAlert(webhookUrl, webhookBearer, {
      level: "error",
      source: "neongambit-healthcheck",
      url: healthUrl,
      message,
      healthPayload: payload,
      timestamp: new Date().toISOString(),
    }).catch((webhookError) => {
      console.error(
        `[health-check] webhook failed: ${webhookError?.message || webhookError}`,
      );
    });
  }

  process.exit(1);
}

main().catch((error) => {
  console.error("[health-check] unexpected failure:", error?.message || error);
  process.exit(1);
});
