import { Router } from "express";
import mongoose from "mongoose";
import { adminAuthMiddleware } from "../middleware/index.js";
import { AdminAuditLog } from "../models/index.js";

const router = Router();

const ALLOWED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function parsePositiveInt(value, fallback, max = 1000) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

function parseDate(value) {
  const asString = String(value || "").trim();
  if (!asString) return null;
  const parsed = new Date(asString);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.use(adminAuthMiddleware);

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(
      100,
      Math.max(1, parsePositiveInt(req.query.limit, 30, 100)),
    );
    const skip = parsePositiveInt(req.query.skip, 0, 50000);

    const query = {};

    const method = String(req.query.method || "")
      .trim()
      .toUpperCase();
    if (ALLOWED_METHODS.has(method)) {
      query.method = method;
    }

    const adminId = String(req.query.adminId || "").trim();
    if (adminId) {
      if (!mongoose.Types.ObjectId.isValid(adminId)) {
        return res.status(400).json({ error: "Invalid adminId filter" });
      }
      query.adminId = adminId;
    }

    const statusFrom = parsePositiveInt(req.query.statusFrom, -1, 999);
    const statusTo = parsePositiveInt(req.query.statusTo, -1, 999);
    if (statusFrom >= 0 || statusTo >= 0) {
      query.statusCode = {};
      if (statusFrom >= 0) query.statusCode.$gte = statusFrom;
      if (statusTo >= 0) query.statusCode.$lte = statusTo;
    }

    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = from;
      if (to) query.createdAt.$lte = to;
    }

    const pathContains = String(req.query.path || "").trim();
    if (pathContains) {
      query.path = { $regex: escapeRegex(pathContains), $options: "i" };
    }

    const [items, total] = await Promise.all([
      AdminAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("adminId", "email username")
        .lean(),
      AdminAuditLog.countDocuments(query),
    ]);

    res.json({
      logs: items.map((item) => ({
        _id: String(item._id),
        admin: item.adminId
          ? {
              _id: String(item.adminId._id),
              email: item.adminId.email || item.adminEmail || "",
              username: item.adminId.username || "",
            }
          : {
              _id: "",
              email: item.adminEmail || "",
              username: "",
            },
        method: item.method,
        path: item.path,
        statusCode: item.statusCode,
        ip: item.ip || "",
        userAgent: item.userAgent || "",
        durationMs: Number(item.durationMs) || 0,
        query: item.query ?? null,
        requestBody: item.requestBody ?? null,
        createdAt: item.createdAt,
      })),
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error("Admin audit logs list error:", error);
    res.status(500).json({ error: "Failed to fetch admin audit logs" });
  }
});

export default router;
