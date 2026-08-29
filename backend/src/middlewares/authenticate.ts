import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/apiError';
import { verifyAccessToken } from '../utils/jwt';
import { recordActivity } from '../utils/activityTracker';
import { shouldForceLogout } from '../utils/forceLogout';

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

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Access token is required');
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    // Check if this user was force-logged out (another device took over)
    if (shouldForceLogout(payload.userId, token)) {
      return res.status(401).json({
        success: false,
        message: 'Session ended. You have been logged in on another device.',
        code: 'FORCE_LOGOUT',
      });
    }

    req.user = {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
    };

    // Track user activity for idle timeout detection
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
