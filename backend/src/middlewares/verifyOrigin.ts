import { Request, Response, NextFunction } from 'express';
import { isAllowedOrigin } from '../config/allowedOrigins';

// ── CSRF hardening: Origin / Referer verification ────────────────────────────
//
// Most of the API is already immune to CSRF because protected routes require a
// Bearer token AND an X-Session-Id custom header — neither of which a browser
// attaches automatically on a forged cross-site request.
//
// The exception is the cookie-authenticated endpoints (/auth/refresh, /auth/logout)
// which rely on the HttpOnly refreshToken cookie. sameSite:'lax' already blocks
// the cookie on cross-site POST in modern browsers; this middleware adds a second,
// independent barrier by rejecting browser requests whose Origin (or Referer, as a
// fallback) is not in our allowlist.
//
// Deliberately permissive for NON-browser callers: if neither Origin nor Referer
// is present (curl, native mobile app, server-to-server), the request is allowed
// through — those are not CSRF vectors, and the mobile app also calls /auth/refresh.
// Only a PRESENT-but-untrusted origin is rejected.
export const verifyOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // No browser-supplied origin context → not a CSRF vector (e.g. mobile/native).
  if (!origin && !referer) {
    return next();
  }

  // Prefer the Origin header; fall back to the Referer's origin.
  let candidate: string | undefined = origin ?? undefined;
  if (!candidate && referer) {
    try {
      candidate = new URL(referer).origin;
    } catch {
      candidate = undefined;
    }
  }

  if (isAllowedOrigin(candidate)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Request origin not allowed',
    code: 'CSRF_ORIGIN_REJECTED',
  });
};
