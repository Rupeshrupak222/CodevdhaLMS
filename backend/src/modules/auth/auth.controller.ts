import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/response';
import { env } from '../../config/env';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'lax' as const,
  // No maxAge = session cookie (deleted when browser/tab closes)
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
      data: { accessToken: result.accessToken },
    });
  }),

  // POST /api/auth/logout
  logout: asyncHandler(async (req: Request, res: Response) => {
    const rawToken = req.cookies?.refreshToken;
    if (rawToken) {
      await authService.logout(rawToken);
    }
    res.clearCookie('refreshToken', getCookieOptions());
    return sendSuccess(res, { message: 'Logged out successfully' });
  }),

  // GET /api/auth/me
  getMe: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getMe(req.user!.userId);
    return sendSuccess(res, { data: user });
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
