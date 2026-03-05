import {
  parseAdminAuthToken,
  parseLegacyAuthToken,
  parseUserAuthToken,
} from "../utils/authToken.js";

export const authMiddleware = (req, res, next) => {
  const authToken = req.cookies.authToken;
  if (!authToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const parsed = parseUserAuthToken(authToken);
  if (!parsed) {
    return res.status(401).json({ error: "Invalid token" });
  }
  req.user = parsed;
  next();
};

export const adminAuthMiddleware = (req, res, next) => {
  const adminToken = req.cookies.adminToken;
  if (!adminToken) {
    return res.status(401).json({ error: "Not authenticated as admin" });
  }

  const adminPayload = parseAdminAuthToken(adminToken);
  if (adminPayload) {
    req.admin = adminPayload;
    return next();
  }

  // Keep legacy semantics: if payload exists but is non-admin, return 403.
  const legacyPayload = parseLegacyAuthToken(adminToken);
  if (
    legacyPayload &&
    Object.prototype.hasOwnProperty.call(legacyPayload, "isAdmin") &&
    legacyPayload.isAdmin === false
  ) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const userPayload = parseUserAuthToken(adminToken);
  if (userPayload) {
    return res.status(403).json({ error: "Not authorized" });
  }

  return res.status(401).json({ error: "Invalid admin token" });
};
