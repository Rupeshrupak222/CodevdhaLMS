import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/apiError';

// Role-based authorization middleware
// Usage: authorize('ADMIN') or authorize('ADMIN', 'TEACHER')
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    if (!roles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access denied. Required role(s): ${roles.join(', ')}`
        )
      );
    }

    next();
  };
};

// Alias helpers
export const adminOnly = authorize('ADMIN');
export const adminOrTeacher = authorize('ADMIN', 'TEACHER');
export const anyRole = authorize('ADMIN', 'TEACHER', 'STUDENT');

// Allows the resource owner OR an admin to access
export const selfOrAdmin = (userIdParam: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());

    const targetId = req.params[userIdParam];
    const isAdmin = req.user.role === 'ADMIN';
    const isSelf = req.user.userId === targetId;

    if (!isAdmin && !isSelf) {
      return next(AppError.forbidden('You can only access your own resources'));
    }

    next();
  };
};

export const selfOrAdminOrTeacher = (userIdParam: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());

    const targetId = req.params[userIdParam];
    const isAdmin = req.user.role === 'ADMIN';
    const isTeacher = req.user.role === 'TEACHER';
    const isSelf = req.user.userId === targetId;

    if (!isAdmin && !isTeacher && !isSelf) {
      return next(AppError.forbidden('You can only access your own resources'));
    }

    next();
  };
};
