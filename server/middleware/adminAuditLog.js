import { AdminAuditLog } from "../models/index.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REDACTED_KEYS = new Set([
  "password",
  "oldpassword",
  "newpassword",
  "confirmpassword",
  "token",
  "authtoken",
  "admintoken",
  "cookie",
  "secret",
  "access_token",
  "refresh_token",
  "authorization",
]);

function toSafeString(value, maxLength = 512) {
  return String(value || "").trim().slice(0, Math.max(1, maxLength));
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return String(forwardedFor[0] || "").trim();
  }
  return toSafeString(req.ip || req.socket?.remoteAddress || "", 128);
}

function sanitizeValue(value, depth = 0) {
  if (value == null) return null;
  if (depth >= 4) return "[TRUNCATED]";

  if (typeof value === "string") {
    return value.length > 1200 ? `${value.slice(0, 1200)}...[TRUNCATED]` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out = {};
    const entries = Object.entries(value).slice(0, 30);
    for (const [key, raw] of entries) {
      const normalizedKey = String(key || "")
        .trim()
        .toLowerCase();
      if (REDACTED_KEYS.has(normalizedKey)) {
        out[key] = "[REDACTED]";
        continue;
      }
      out[key] = sanitizeValue(raw, depth + 1);
    }
    return out;
  }
  return String(value);
}

export function adminAuditLogMiddleware(req, res, next) {
  const method = String(req.method || "GET").toUpperCase();
  if (!MUTATING_METHODS.has(method)) {
    next();
    return;
  }

  const startedAt = Date.now();
  let finished = false;

  res.on("finish", () => {
    if (finished) return;
    finished = true;

    const adminId = req.admin?.adminId;
    if (!adminId) return;

    const payload = {
      adminId,
      adminEmail: toSafeString(req.admin?.email || "", 320),
      method,
      path: toSafeString(req.originalUrl || req.url || "", 1024),
      statusCode: Number(res.statusCode) || 0,
      ip: toSafeString(getClientIp(req), 128),
      userAgent: toSafeString(req.headers["user-agent"] || "", 512),
      durationMs: Math.max(0, Date.now() - startedAt),
      query: sanitizeValue(req.query),
      requestBody: sanitizeValue(req.body),
    };

    void AdminAuditLog.create(payload).catch((error) => {
      console.error("Admin audit log create error:", error);
    });
  });

  next();
}
