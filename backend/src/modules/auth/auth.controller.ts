import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/response';
import { env } from '../../config/env';
import { blacklistToken } from '../../utils/tokenBlacklist';
import { decodeJwt, verifyAccessToken } from '../../utils/jwt';

const getCookieOptions = () => ({
  httpOnly: true,           // not readable by JS — protects against XSS token theft
  secure: env.isProd,       // HTTPS-only in production
  sameSite: 'lax' as const, // CSRF hardening
  // No maxAge = session cookie (deleted when browser/tab closes)
  //
  // sameSite policy note (deployment-dependent — do not change blindly):
  //   - 'lax' (current): the cookie is NOT sent on cross-site XHR/fetch, which
  //     blocks CSRF on the credentialed refresh endpoint. Correct when the
  //     frontend and API are same-site (e.g. app.codvedha.com + api.codvedha.com
  //     share the codvedha.com registrable domain).
  //   - 'strict' would also work same-site and is marginally stronger, but can
  //     break flows that rely on top-level cross-site navigation.
  //   - If the frontend and API are deployed on DIFFERENT sites, the refresh
  //     cookie would require sameSite:'none' + secure:true to be sent at all —
  //     which is weaker against CSRF and should be paired with a CSRF token.
  // Keeping 'lax' as the safe default; revisit only if the deployment topology
  // makes the frontend and API cross-site.
});

export const authController = {
  // POST /api/auth/register
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    return sendCreated(res, {
      message: 'Account created successfully',
      data: result.user,
    });
  }),

  // POST /api/auth/signup (mobile app — auto-login after signup)
  signup: asyncHandler(async (req: Request, res: Response) => {
    const meta = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
    const result = await authService.signup(req.body, meta);

    // Set refresh token in HttpOnly cookie
    if (result.refreshToken && result.refreshTokenMaxAgeMs) {
      res.cookie('refreshToken', result.refreshToken, getCookieOptions());
    }

    return sendCreated(res, {
      message: 'Account created successfully',
      data: {
        accessToken: result.accessToken,
        sessionId: result.sessionId,
        user: result.user,
      },
    });
  }),

  // POST /api/auth/login
  login: asyncHandler(async (req: Request, res: Response) => {
    const meta = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
    const result = await authService.login(req.body, meta);

    // Set refresh token in HttpOnly cookie if present (NEVER send in response body)
    if ('refreshToken' in result && result.refreshToken && result.refreshTokenMaxAgeMs) {
      res.cookie('refreshToken', result.refreshToken, getCookieOptions());
    }

    // Strip refresh token from response data to prevent XSS theft
    const { refreshToken, refreshTokenMaxAgeMs, ...safeResult } = result as any;

    return sendSuccess(res, {
      message: 'Login successful',
      data: safeResult,
    });
  }),

  // POST /api/auth/face-enroll
  enrollFace: asyncHandler(async (req: Request, res: Response) => {
    const { tempToken, embedding, imageBase64 } = req.body;

    const meta = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
    
    const result = await authService.enrollFace(tempToken, embedding, imageBase64, meta);
    
    res.cookie('refreshToken', result.refreshToken, getCookieOptions());

    return sendSuccess(res, {
      message: 'Face enrolled successfully',
      data: {
        accessToken: result.accessToken,
        sessionId: result.sessionId,
        user: result.user,
      },
    });
  }),

  // POST /api/auth/face-verify
  verifyFace: asyncHandler(async (req: Request, res: Response) => {
    const { tempToken, embedding } = req.body;

    const meta = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
    
    const result = await authService.verifyFace(tempToken, embedding, meta);
    
    res.cookie('refreshToken', result.refreshToken, getCookieOptions());

    return sendSuccess(res, {
      message: 'Face verified successfully',
      data: {
        accessToken: result.accessToken,
        sessionId: result.sessionId,
        user: result.user,
      },
    });
  }),

  // POST /api/auth/refresh
  refresh: asyncHandler(async (req: Request, res: Response) => {
    const rawToken = req.cookies?.refreshToken;
    if (!rawToken) {
      res.status(401).json({ success: false, message: 'Refresh token not found' });
      return;
    }

    const meta = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
    const result = await authService.refreshToken(rawToken, meta);

    // Rotate cookie (session cookie — no maxAge)
    res.cookie('refreshToken', result.refreshToken, getCookieOptions());

    return sendSuccess(res, {
      message: 'Token refreshed',
      data: { accessToken: result.accessToken, sessionId: result.sessionId },
    });
  }),

  // POST /api/auth/logout
  logout: asyncHandler(async (req: Request, res: Response) => {
    const rawToken = req.cookies?.refreshToken;

    // Revoke session(s) + clear activeSessionId. Pass the authenticated userId so
    // the session can be cleared even if the refresh cookie is missing.
    await authService.logout(rawToken || '', req.user?.userId);

    // Blacklist the current access token so it cannot be reused before its
    // natural expiry (defends a stolen/leaked access token after logout).
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.slice(7);
      const decoded = decodeJwt(accessToken);
      const expiresAtMs = decoded?.exp ? decoded.exp * 1000 : undefined;
      await blacklistToken(accessToken, expiresAtMs);
    }

    res.clearCookie('refreshToken', getCookieOptions());
    return sendSuccess(res, { message: 'Logged out successfully' });
  }),

  // GET /api/auth/me
  getMe: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getMe(req.user!.userId);
    return sendSuccess(res, { data: user });
  }),

  // GET /api/auth/session-check
  // Lightweight heartbeat: verifies the Bearer token and compares X-Session-Id
  // against the user's active session WITHOUT running the full requireAuth
  // pipeline (so it never 401s on a mismatch — it reports it in the body).
  sessionCheck: asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendSuccess(res, { data: { valid: false, code: 'NO_TOKEN' } });
    }

    const token = authHeader.slice(7);
    let payload: { userId: string };
    try {
      payload = verifyAccessToken(token);
    } catch {
      return sendSuccess(res, { data: { valid: false, code: 'INVALID_TOKEN' } });
    }

    const headerSessionId = req.headers['x-session-id'];
    const sessionId = Array.isArray(headerSessionId) ? headerSessionId[0] : headerSessionId;

    const result = await authService.sessionCheck(payload.userId, sessionId);
    return sendSuccess(res, { data: result });
  }),

  // POST /api/auth/forgot-password
  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body);
    return sendSuccess(res, {
      message: 'If an account exists, a reset link has been sent',
    });
  }),

  // POST /api/auth/reset-password
  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);
    return sendSuccess(res, { message: 'Password reset successfully' });
  }),
};
