import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/apiError';
import { verifyAccessToken } from '../utils/jwt';
import { recordActivity } from '../utils/activityTracker';
import { shouldForceLogout } from '../utils/forceLogout';
import { isTokenBlacklisted } from '../utils/tokenBlacklist';
import { authRepository } from '../modules/auth/auth.repository';

// Augment Express Request to carry authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        email: string;
      };
    }
  }
}

// Strict 48-hex format for the X-Session-Id header (24 random bytes).
const SESSION_ID_PATTERN = /^[0-9a-f]{48}$/;

const forceLogoutResponse = (res: Response, message: string) =>
  res.status(401).json({ success: false, message, code: 'FORCE_LOGOUT' });

/**
 * requireAuth pipeline (in order):
 *   1. Extract Bearer token
 *   2. Blacklist check (DB-backed + 60s negative cache)
 *   3. Verify JWT (HS256 pinned)
 *   4. Token-level force-logout (another device took over)
 *   5. Single-session: X-Session-Id must match the user's activeSessionId
 *   6. Record activity (idle tracking)
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Access token is required');
    }

    const token = authHeader.slice(7);

    // 2. Reject tokens explicitly invalidated (e.g. on logout) before verifying claims
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Session has ended. Please log in again.',
        code: 'TOKEN_REVOKED',
      });
    }

    // 3. Verify signature + claims (throws on invalid/expired)
    const payload = verifyAccessToken(token);

    // 4. Token-level force-logout (another device took over this account)
    if (shouldForceLogout(payload.userId, token)) {
      return forceLogoutResponse(
        res,
        'Session ended. You have been logged in on another device.'
      );
    }

    // 5. Single-session enforcement via X-Session-Id header
    const headerSessionId = req.headers['x-session-id'];
    const sessionId = Array.isArray(headerSessionId) ? headerSessionId[0] : headerSessionId;

    // Only enforce when the header is present AND well-formed. A malformed or
    // missing header is treated as a mismatch (fail-closed) for protected routes.
    if (!sessionId || !SESSION_ID_PATTERN.test(sessionId)) {
      return forceLogoutResponse(res, 'Missing or invalid session identifier.');
    }

    const activeSessionId = await authRepository.getActiveSessionId(payload.userId);
    if (!activeSessionId || activeSessionId !== sessionId) {
      return forceLogoutResponse(
        res,
        'Session ended. You have been logged in on another device.'
      );
    }

    req.user = {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
    };

    // 6. Track user activity for idle timeout detection
    recordActivity(payload.userId);

    next();
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError') {
      return next(AppError.unauthorized('Invalid access token'));
    }
    if (err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Access token expired'));
    }
    next(err);
  }
};
