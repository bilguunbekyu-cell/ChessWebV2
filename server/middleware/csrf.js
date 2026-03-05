/**
 * Double-submit cookie CSRF protection.
 *
 * How it works:
 *   1. On every response the server sets a `_csrf` cookie with a random token.
 *   2. For state-changing requests (POST / PUT / PATCH / DELETE) the client
 *      must copy the token value into the `X-CSRF-Token` header.
 *   3. Because a third-party site cannot read first-party cookies, an attacker
 *      cannot replicate the header — forged requests will be rejected.
 *
 * The SPA frontend reads the cookie and attaches the header automatically
 * via a fetch/axios interceptor.
 *
 * Set CSRF_ENABLED=true to activate; other env knobs:
 *   CSRF_COOKIE_NAME   – cookie name           (default: "_csrf")
 *   CSRF_HEADER_NAME   – header to check       (default: "x-csrf-token")
 *   CSRF_COOKIE_SECURE – Secure flag on cookie  (default: true in production)
 */
import crypto from "crypto";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Factory that returns CSRF middleware.
 * Usage: `app.use(createCsrfProtection());`
 */
export function createCsrfProtection({
  cookieName = process.env.CSRF_COOKIE_NAME || "_csrf",
  headerName = (process.env.CSRF_HEADER_NAME || "x-csrf-token").toLowerCase(),
  secureCookie = process.env.CSRF_COOKIE_SECURE !== "false" &&
    process.env.NODE_ENV === "production",
} = {}) {
  return function csrfMiddleware(req, res, next) {
    /* 1. Ensure the CSRF cookie exists (set / refresh every request) */
    let token = req.cookies?.[cookieName];
    if (!token) {
      token = crypto.randomBytes(32).toString("hex");
    }

    res.cookie(cookieName, token, {
      httpOnly: false,        // must be readable by JS
      secure: secureCookie,
      sameSite: "Strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 1000, // 24 h
    });

    /* 2. For mutating methods, verify the header matches the cookie */
    if (!SAFE_METHODS.has(req.method)) {
      const headerToken = req.headers[headerName];
      if (!headerToken || headerToken !== token) {
        return res
          .status(403)
          .json({ error: "CSRF token missing or invalid" });
      }
    }

    next();
  };
}
