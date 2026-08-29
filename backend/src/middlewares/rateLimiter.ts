import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// ─── Rate Limiting Strategy ──────────────────────────────────────────────────
//
// The system uses a layered approach:
//
// Layer 1: Global IP-based limit (catches DDoS, bots)
// Layer 2: Auth-specific limits (prevents brute-force on public endpoints)
// Layer 3: Role-based limits (after authentication — different limits per role)
//
// WHY role-based?
// - Students: browse courses, view materials, submit quizzes (read-heavy, moderate writes)
// - Teachers: upload materials, create quizzes, grade tasks (write-heavy, needs higher limits)
// - Admins: manage everything (highest limits)
//
// SHARED NETWORKS:
// Schools/colleges often have hundreds of students behind one IP (NAT).
// IP-based limits must be generous. Role-based limits are per-user (via JWT userId).
// ─────────────────────────────────────────────────────────────────────────────

// ── Layer 1: Global IP-based (DDoS protection) ───────────────────────────────
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // generous: campus with 500 students × 3 requests each = 1500
  message: { success: false, message: 'Too many requests from this network, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Uses default IP-based key generator (handles IPv6 correctly)
});

// ── Layer 2: Auth endpoints (IP-based, public — before login) ────────────────
// Each endpoint gets its own limiter instance (separate counters)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // 60 login attempts per IP per 15 min (campus morning rush)
  message: { success: false, message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour (registration is infrequent)
  max: 10, // 10 registrations per IP per hour (prevents bot spam)
  message: { success: false, message: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 signups per IP per hour (same policy as register — prevents bot spam)
  message: { success: false, message: 'Too many signup attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 password resets per IP per 15 min
  message: { success: false, message: 'Too many password reset requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Face auth — stricter since it's biometric brute-force sensitive
export const faceAuthLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 attempts per 10 min — generous for camera retries, blocks brute-force
  message: { success: false, message: 'Too many face authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Layer 3: Role-based (per-user, after authentication) ─────────────────────
// Uses userId from JWT token as the rate limit key (NOT IP-based)
// validate: false disables the IPv6 warning since we're keying by userId, not IP

// Students: read-heavy usage (viewing courses, materials, dashboards)
export const studentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // 200 requests per 15 min per student (~13/min — normal browsing)
  message: { success: false, message: 'Request limit reached, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.userId || 'anonymous',
  validate: false, // userId-based key, not IP — skip IPv6 validation
});

// Teachers: write-heavy (uploading, grading, creating content)
export const teacherLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // 500 requests per 15 min per teacher (~33/min — bulk operations)
  message: { success: false, message: 'Request limit reached, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.userId || 'anonymous',
  validate: false,
});

// Admins: highest access (managing users, courses, analytics)
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 800, // 800 requests per 15 min per admin (~53/min — dashboard + management)
  message: { success: false, message: 'Request limit reached, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.userId || 'anonymous',
  validate: false,
});

// Upload limiter — per-user (teachers/admins upload bulk materials)
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // 50 file uploads per 15 min per user
  message: { success: false, message: 'Too many file uploads, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.userId || 'anonymous',
  validate: false,
});

// ── Role-based middleware (auto-selects limiter based on user role) ───────────
export const roleLimiter = (req: Request, res: Response, next: NextFunction) => {
  const role = req.user?.role;

  if (role === 'ADMIN') {
    return adminLimiter(req, res, next);
  } else if (role === 'TEACHER') {
    return teacherLimiter(req, res, next);
  } else {
    return studentLimiter(req, res, next);
  }
};
