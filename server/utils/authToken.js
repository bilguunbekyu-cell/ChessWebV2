import jwt from "jsonwebtoken";

const USER_FALLBACK_SECRET = "neongambit-user-dev-secret-change-me";
const ADMIN_FALLBACK_SECRET = "neongambit-admin-dev-secret-change-me";

function toStringValue(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function buildUserSecret() {
  return (
    toStringValue(process.env.AUTH_JWT_SECRET) ||
    toStringValue(process.env.JWT_SECRET) ||
    USER_FALLBACK_SECRET
  );
}

function buildAdminSecret() {
  return (
    toStringValue(process.env.ADMIN_JWT_SECRET) ||
    toStringValue(process.env.AUTH_JWT_SECRET) ||
    toStringValue(process.env.JWT_SECRET) ||
    ADMIN_FALLBACK_SECRET
  );
}

export function decodeAuthCookieToken(rawToken) {
  const value = toStringValue(rawToken);
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseLegacyAuthToken(rawToken) {
  const decoded = decodeAuthCookieToken(rawToken);
  if (!decoded) return null;
  try {
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalizeUserPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const userId = toStringValue(payload.userId || payload.sub || payload.id);
  if (!userId) return null;
  return {
    userId,
    email: toStringValue(payload.email),
    fullName: toStringValue(payload.fullName || payload.name),
  };
}

function normalizeAdminPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.isAdmin !== true) return null;
  const adminId = toStringValue(payload.adminId || payload.sub || payload.id);
  if (!adminId) return null;
  return {
    adminId,
    email: toStringValue(payload.email),
    username: toStringValue(payload.username),
    isAdmin: true,
  };
}

function verifyJwtToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

export function signUserAuthToken(payload, options = {}) {
  const normalized = normalizeUserPayload(payload);
  if (!normalized) {
    throw new Error("Invalid user token payload");
  }
  const rememberMe = options.rememberMe === true;
  const expiresIn = rememberMe ? "30d" : "7d";
  return jwt.sign(
    {
      userId: normalized.userId,
      email: normalized.email,
      fullName: normalized.fullName,
      tokenType: "user",
    },
    buildUserSecret(),
    { expiresIn },
  );
}

export function signAdminAuthToken(payload, options = {}) {
  const normalized = normalizeAdminPayload({
    ...payload,
    isAdmin: true,
  });
  if (!normalized) {
    throw new Error("Invalid admin token payload");
  }
  const expiresIn = toStringValue(options.expiresIn) || "1d";
  return jwt.sign(
    {
      adminId: normalized.adminId,
      email: normalized.email,
      username: normalized.username,
      isAdmin: true,
      tokenType: "admin",
    },
    buildAdminSecret(),
    { expiresIn },
  );
}

export function parseUserAuthToken(rawToken) {
  const decoded = decodeAuthCookieToken(rawToken);
  if (!decoded) return null;

  const jwtPayload = verifyJwtToken(decoded, buildUserSecret());
  const normalizedJwt = normalizeUserPayload(jwtPayload);
  if (normalizedJwt) return normalizedJwt;

  return normalizeUserPayload(parseLegacyAuthToken(rawToken));
}

export function parseAdminAuthToken(rawToken) {
  const decoded = decodeAuthCookieToken(rawToken);
  if (!decoded) return null;

  const jwtPayload = verifyJwtToken(decoded, buildAdminSecret());
  const normalizedJwt = normalizeAdminPayload(jwtPayload);
  if (normalizedJwt) return normalizedJwt;

  return normalizeAdminPayload(parseLegacyAuthToken(rawToken));
}
