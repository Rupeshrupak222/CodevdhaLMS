import { v4 as uuidv4 } from 'uuid';
import { authRepository } from './auth.repository';
import { hashPassword, comparePassword } from '../../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateTempToken,
  verifyTempToken,
} from '../../utils/jwt';
import { hashToken, generateSecureToken, generateSessionId } from '../../utils/crypto';
import { isAccountLocked, recordFailedAttempt, clearLockout, isIpLockedOut, recordFailedIpAttempt, clearIpLockout } from '../../utils/loginLockout';
import { logAdminEvent } from '../../utils/adminAuditLog';
import { isTempTokenUsed, markTempTokenUsed } from '../../utils/tempTokenBlacklist';
import { isSessionActive, clearActivity, recordActivity } from '../../utils/activityTracker';
import { markForceLogout, clearForceLogout } from '../../utils/forceLogout';
import { AppError } from '../../utils/apiError';
import { env } from '../../config/env';
import { uploadToS3, resolveS3Url } from '../../utils/s3';
import { euclideanDistance } from '../../utils/math';
import {
  LoginInput,
  RegisterInput,
  SignupInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.validator';

const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REFRESH_TOKEN_REMEMBER_ME_DAYS = 30;
const RESET_TOKEN_EXPIRY_MINUTES = 15;

export const authService = {
  // ── Register (web — returns user only, no tokens) ───────────────────────────
  register: async (input: RegisterInput) => {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      // Generic message — don't reveal whether email is registered
      throw AppError.badRequest('Registration could not be completed. Please try a different email or login to your existing account.');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await authRepository.createUser({
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'STUDENT',
    });

    return { user };
  },

  // ── Signup (mobile app — returns user + tokens for immediate login) ─────────
  signup: async (
    input: SignupInput,
    meta: { userAgent?: string; ipAddress?: string }
  ) => {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw AppError.badRequest('Registration could not be completed. Please try a different email or login to your existing account.');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await authRepository.createUser({
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'STUDENT',
    });

    // Generate tokens so user is logged in immediately after signup
    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    const tokenId = uuidv4();
    const rawRefreshToken = generateRefreshToken({ userId: user.id, tokenId });
    const tokenHash = hashToken(rawRefreshToken);

    const sessionId = generateSessionId();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    const refreshTokenMaxAgeMs = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash,
      accessTokenHash: hashToken(accessToken),
      sessionId,
      expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    await authRepository.setActiveSessionId(user.id, sessionId);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      refreshTokenMaxAgeMs,
      sessionId,
      user,
    };
  },

  // ── Login ───────────────────────────────────────────────────────────────────
  login: async (
    input: LoginInput,
    meta: { userAgent?: string; ipAddress?: string }
  ) => {
    // Check per-IP lockout FIRST — catches credential-stuffing / password-spraying
    // where an attacker cycles through many emails from a single IP (which the
    // per-email lockout below would not slow down).
    const ip = meta.ipAddress;
    if (ip) {
      const ipLock = isIpLockedOut(ip, meta.userAgent);
      if (ipLock.locked) {
        throw AppError.tooManyRequests(
          'Too many failed login attempts. Please try again later.'
        );
      }
    }

    // Check per-account-per-device lockout BEFORE any database/bcrypt operations.
    // Scoped to this device so blocking one account here does not affect the same
    // account on the user's other devices, nor other accounts on this device.
    // Message is intentionally generic — it does not reveal remaining attempts or
    // whether the account is privileged (which would leak account state).
    if (ip) {
      const lockStatus = isAccountLocked(input.email, ip, meta.userAgent);
      if (lockStatus.locked) {
        throw AppError.tooManyRequests(
          'Too many failed login attempts. Please try again later.'
        );
      }
    }

    const user = await authRepository.findUserByEmail(input.email);

    // Always run bcrypt to prevent timing-based email enumeration
    const dummyHash = '$2a$12$000000000000000000000uGE5EB1ORqTSTfDRULhHRCQOTLF0Rxqu';
    const isPasswordValid = await comparePassword(
      input.password,
      user ? user.passwordHash : dummyHash
    );

    if (!user || !isPasswordValid) {
      const userRole = user?.role;

      // Record the failure against BOTH the account-on-this-device (5 -> 10 min)
      // and the device total (10 -> 10 min). Both are scoped per device.
      let lockResult = { locked: false, attemptsRemaining: 0 };
      if (ip) {
        lockResult = recordFailedAttempt(input.email, ip, meta.userAgent);
        recordFailedIpAttempt(ip, meta.userAgent);
      }

      // Log failed admin login attempts
      if (userRole === 'ADMIN' || input.role === 'ADMIN') {
        logAdminEvent({
          userId: user?.id || 'unknown',
          email: input.email,
          ipAddress: meta.ipAddress || 'unknown',
          userAgent: meta.userAgent || 'unknown',
          timestamp: new Date(),
          action: 'LOGIN_FAILED',
        });
      }

      // Generic responses only — do not reveal remaining attempts (leaks that the
      // account exists and how close it is to lockout) or role-based lock duration
      // (leaks whether the email is an admin).
      if (lockResult.locked) {
        throw AppError.tooManyRequests(
          'Too many failed login attempts. Please try again later.'
        );
      }
      throw AppError.unauthorized('Invalid email or password.');
    }

    // Successful credentials — clear any lockout for this account+device and the
    // device total.
    if (ip) {
      clearLockout(input.email, ip, meta.userAgent);
      clearIpLockout(ip, meta.userAgent);
    }

    if (!user.isActive) {
      throw AppError.forbidden('Your account has been deactivated');
    }

    // Log successful admin login
    if (user.role === 'ADMIN') {
      logAdminEvent({
        userId: user.id,
        email: user.email,
        ipAddress: meta.ipAddress || 'unknown',
        userAgent: meta.userAgent || 'unknown',
        timestamp: new Date(),
        action: 'LOGIN_SUCCESS',
      });
    }

    // Enforce email verification for self-registered students
    // Admin-created users (teachers/admins) bypass this since admin verified them
    if (!user.isEmailVerified && user.role === 'STUDENT') {
      // Allow login but flag it — in future, block completely when email service is active
      // For now, we log a warning (email verification is not yet sending emails)
      console.warn(`[AUTH] Unverified email login: ${user.email}`);
    }

    if (input.role && user.role !== input.role) {
      throw AppError.forbidden(`Access denied: This account is not registered as ${input.role.toLowerCase() === 'teacher' ? 'faculty' : input.role.toLowerCase()}.`);
    }

    // Single-device enforcement: check for active sessions
    const activeSessions = await authRepository.countRefreshTokensForUser(user.id);
    if (activeSessions > 0 && !input.forceLogin) {
      // Check if the existing session is actually active (used in last 15 min)
      if (isSessionActive(user.id)) {
        // Session is actively being used on another device — ask for confirmation
        return {
          requireSessionConfirmation: true,
          message: 'There is an active session on another device. Do you want to end it and login here?',
          activeSessions,
        };
      } else {
        // Session is idle (> 15 min inactivity) — auto-clear and proceed normally
        await authRepository.deleteAllRefreshTokensForUser(user.id);
        clearActivity(user.id);
      }
    }

    // If forceLogin=true, revoke all existing sessions before creating new one
    if (input.forceLogin && activeSessions > 0) {
      await authRepository.deleteAllRefreshTokensForUser(user.id);
      clearActivity(user.id);
      // Mark user for immediate force-logout on their other device
      // We'll pass the new token after generation (below)
    }

    if (user.role === 'TEACHER') {
      const tempToken = generateTempToken({ userId: user.id, role: user.role });
      
      if (!user.isFaceRegistered) {
        return {
          requireFaceEnrollment: true,
          tempToken,
          avatar: user.avatar,
        };
      } else {
        return {
          requireFaceVerification: true,
          tempToken,
          avatar: user.avatar,
        };
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    // If this is a force-login, mark the old session's token for immediate
    // termination (everything except this brand-new token gets kicked).
    // Otherwise, clear any stale force-logout flag left over from an earlier
    // force-login — if we didn't, that stale flag (which only whitelists the ONE
    // token captured back then) would reject this fresh token and bounce the user
    // out of the dashboard right after login.
    if (input.forceLogin) {
      markForceLogout(user.id, accessToken);
    } else {
      clearForceLogout(user.id);
    }

    const tokenId = uuidv4();
    const rawRefreshToken = generateRefreshToken({ userId: user.id, tokenId });
    const tokenHash = hashToken(rawRefreshToken);

    // 48-hex session id bound to this login and enforced via X-Session-Id
    const sessionId = generateSessionId();

    const expiryDays = input.rememberMe
      ? REFRESH_TOKEN_REMEMBER_ME_DAYS
      : REFRESH_TOKEN_EXPIRY_DAYS;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    const refreshTokenMaxAgeMs = expiryDays * 24 * 60 * 60 * 1000;

    await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash,
      accessTokenHash: hashToken(accessToken),
      sessionId,
      expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    // Bind this session as the user's only active session
    await authRepository.setActiveSessionId(user.id, sessionId);

    // Count the freshly-created session as active immediately. Without this,
    // isSessionActive() stays false until the client's first authenticated
    // request — so a second login in that window would skip the confirmation
    // popup and silently kill this session instead of prompting.
    recordActivity(user.id);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: await resolveS3Url(user.avatar),
      enrollments: (user as any).enrollments || [],
    };

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      refreshTokenMaxAgeMs,
      sessionId,
      user: safeUser,
    };
  },

  // ── Face Auth ───────────────────────────────────────────────────────────────
  enrollFace: async (
    tempToken: string,
    embedding: number[],
    imageBase64: string | undefined,
    meta: { userAgent?: string; ipAddress?: string }
  ) => {
    // Prevent temp token replay
    if (isTempTokenUsed(tempToken)) {
      throw AppError.unauthorized('This authentication token has already been used');
    }

    let payload;
    try {
      payload = verifyTempToken(tempToken);
    } catch {
      throw AppError.unauthorized('Invalid or expired temporary token');
    }

    const user = await authRepository.findUserById(payload.userId);
    if (!user || user.role !== 'TEACHER') {
      throw AppError.unauthorized('User not found or not a faculty member');
    }

    if (user.isFaceRegistered) {
      throw AppError.badRequest('Face already enrolled');
    }

    let finalAvatarUrl = user.avatar;
    if (imageBase64 && !user.avatar) {
      try {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const key = `avatars/${user.id}-${Date.now()}.jpg`;
        const uploadResult = await uploadToS3(buffer, key, 'image/jpeg');
        finalAvatarUrl = uploadResult.url;
      } catch (err) {
        console.error('Failed to upload captured face to S3:', err);
      }
    }

    await authRepository.updateUserFaceAndAvatar(user.id, embedding, true, finalAvatarUrl);

    // Refresh user object after update
    const updatedUser = { ...user, isFaceRegistered: true, faceEmbedding: embedding, avatar: finalAvatarUrl };

    // Mark temp token as used (prevent replay)
    markTempTokenUsed(tempToken);

    // Generate standard tokens
    return authService._generateTokensForUser(updatedUser, meta, false);
  },

  verifyFace: async (
    tempToken: string,
    embedding: number[],
    meta: { userAgent?: string; ipAddress?: string }
  ) => {
    // Prevent temp token replay
    if (isTempTokenUsed(tempToken)) {
      throw AppError.unauthorized('This authentication token has already been used');
    }

    let payload;
    try {
      payload = verifyTempToken(tempToken);
    } catch {
      throw AppError.unauthorized('Invalid or expired temporary token');
    }

    const user = await authRepository.findUserById(payload.userId);
    if (!user || user.role !== 'TEACHER') {
      throw AppError.unauthorized('User not found or not a faculty member');
    }

    const faceEmbedding = user.faceEmbedding as number[];
    if (!user.isFaceRegistered || faceEmbedding.length === 0) {
      throw AppError.badRequest('Face not enrolled');
    }

    // Convert Prisma array to normal number array if needed, then compare
    const storedEmbedding = faceEmbedding;
    const distance = euclideanDistance(embedding, storedEmbedding);
    // Only log the exact distance in development — printing it in prod would let
    // an attacker calibrate a spoof against the match threshold.
    if (env.isDev) {
      console.log(`[FaceVerify] Euclidean distance: ${distance} (threshold: 0.65)`);
    }

    // Threshold 0.65: allows cross-device matching (web enroll → mobile verify).
    // The client-facing message is generic — it never reveals the exact distance.
    if (distance > 0.65) {
      throw AppError.unauthorized('Face verification failed. Please try again.');
    }

    // Mark temp token as used (prevent replay)
    markTempTokenUsed(tempToken);

    // Generate standard tokens
    return authService._generateTokensForUser(user, meta, false);
  },

  _generateTokensForUser: async (
    user: any,
    meta: { userAgent?: string; ipAddress?: string },
    rememberMe: boolean
  ) => {
    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    const tokenId = uuidv4();
    const rawRefreshToken = generateRefreshToken({ userId: user.id, tokenId });
    const tokenHash = hashToken(rawRefreshToken);

    const sessionId = generateSessionId();

    const expiryDays = rememberMe
      ? REFRESH_TOKEN_REMEMBER_ME_DAYS
      : REFRESH_TOKEN_EXPIRY_DAYS;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    const refreshTokenMaxAgeMs = expiryDays * 24 * 60 * 60 * 1000;

    // Single-device policy: delete any remaining sessions before creating new one
    await authRepository.deleteAllRefreshTokensForUser(user.id);

    await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash,
      accessTokenHash: hashToken(accessToken),
      sessionId,
      expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    // Bind this session as the user's only active session
    await authRepository.setActiveSessionId(user.id, sessionId);

    // Fresh session established — clear any stale force-logout flag so this new
    // token is not immediately rejected by shouldForceLogout().
    clearForceLogout(user.id);

    // Count this session as active immediately so a subsequent login triggers
    // the confirmation popup rather than silently killing this session.
    recordActivity(user.id);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar ? await resolveS3Url(user.avatar) : null,
      enrollments: (user as any).enrollments || [],
    };

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      refreshTokenMaxAgeMs,
      sessionId,
      user: safeUser,
    };
  },

  // ── Refresh Token ────────────────────────────────────────────────────────────
  refreshToken: async (
    rawToken: string,
    meta: { userAgent?: string; ipAddress?: string }
  ) => {
    // Verify JWT
    let payload: { userId: string; tokenId: string };
    try {
      payload = verifyRefreshToken(rawToken);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    // Check DB
    const tokenHash = hashToken(rawToken);
    const stored = await authRepository.findRefreshToken(tokenHash);

    if (!stored || new Date() > stored.expiresAt) {
      // TOKEN REUSE DETECTION: If the token was valid (JWT verifies) but not in DB,
      // it means a previously-rotated token was replayed — possible theft.
      // Invalidate ALL tokens for this user as a security precaution.
      if (!stored) {
        await authRepository.deleteAllRefreshTokensForUser(payload.userId);
        console.warn(`[SECURITY] Refresh token reuse detected for user ${payload.userId}. All sessions revoked.`);
      }
      throw AppError.unauthorized('Refresh token not found or expired');
    }

    // Reject sessions that were explicitly revoked (logout / force-logout)
    if (stored.revokedAt) {
      throw AppError.unauthorized('Session has been revoked');
    }

    // Check if user is still active (prevents deactivated users from refreshing)
    if (!stored.user.isActive) {
      // Revoke all sessions for deactivated user
      await authRepository.deleteAllRefreshTokensForUser(stored.user.id);
      await authRepository.setActiveSessionId(stored.user.id, null);
      throw AppError.forbidden('Your account has been deactivated');
    }

    // Token rotation: delete old, create new. The session id is preserved across
    // rotation so the client's X-Session-Id remains valid without a re-login.
    await authRepository.deleteRefreshToken(tokenHash);

    const sessionId = stored.sessionId ?? generateSessionId();

    const newTokenId = uuidv4();
    const newAccessToken = generateAccessToken({
      userId: stored.user.id,
      role: stored.user.role,
      email: stored.user.email,
    });
    const newRawRefresh = generateRefreshToken({
      userId: stored.user.id,
      tokenId: newTokenId,
    });
    const newHash = hashToken(newRawRefresh);
    const newExpiry = new Date(stored.expiresAt); // preserve original expiry window

    await authRepository.createRefreshToken({
      userId: stored.user.id,
      tokenHash: newHash,
      accessTokenHash: hashToken(newAccessToken),
      sessionId,
      expiresAt: newExpiry,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    // Re-affirm this session as the active one (covers the case where the stored
    // sessionId was regenerated for a legacy row without one).
    await authRepository.setActiveSessionId(stored.user.id, sessionId);

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefresh,
      refreshTokenExpiresAt: newExpiry,
      sessionId,
    };
  },

  // ── Logout ───────────────────────────────────────────────────────────────────
  // Revokes the user's session(s) and clears their activeSessionId so any request
  // carrying the old X-Session-Id is rejected. The controller additionally
  // blacklists the current access token (it holds the Bearer token).
  logout: async (rawToken: string, userId?: string) => {
    const tokenHash = hashToken(rawToken);
    try {
      const token = await authRepository.findRefreshToken(tokenHash);
      const resolvedUserId = token?.user?.id ?? userId;

      if (resolvedUserId) {
        // Single-session model: end the session entirely.
        await authRepository.deleteAllRefreshTokensForUser(resolvedUserId);
        await authRepository.setActiveSessionId(resolvedUserId, null);
        clearActivity(resolvedUserId);
      } else {
        // Fall back to deleting just this token if we couldn't resolve a user.
        await authRepository.deleteRefreshToken(tokenHash);
      }
    } catch {
      // Token already gone — that's fine
      if (userId) {
        try {
          await authRepository.setActiveSessionId(userId, null);
        } catch {
          /* ignore */
        }
        clearActivity(userId);
      }
    }
  },

  // ── Session heartbeat ─────────────────────────────────────────────────────────
  // Lightweight check used by the frontend to detect force-logout. Returns
  // valid=false with FORCE_LOGOUT when the provided session id no longer matches
  // the user's active session. When no session id is provided yet (the first
  // moments after login) it returns valid=true to avoid a false logout.
  sessionCheck: async (userId: string, sessionId?: string) => {
    if (!sessionId) {
      return { valid: true };
    }
    const activeSessionId = await authRepository.getActiveSessionId(userId);
    if (!activeSessionId || activeSessionId !== sessionId) {
      return { valid: false, code: 'FORCE_LOGOUT' as const };
    }
    return { valid: true };
  },

  // ── Get current user ─────────────────────────────────────────────────────────
  getMe: async (userId: string) => {
    const user = await authRepository.findUserById(userId);
    if (!user) throw AppError.notFound('User not found');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: await resolveS3Url(user.avatar),
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      enrollments: (user as any).enrollments || [],
    };
  },

  // ── Forgot Password ──────────────────────────────────────────────────────────
  forgotPassword: async (input: ForgotPasswordInput) => {
    const user = await authRepository.findUserByEmail(input.email);

    // Always respond 200 to prevent email enumeration
    if (!user) return;

    // Clean old reset tokens
    await authRepository.deletePasswordResetsForUser(user.id);

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await authRepository.createPasswordReset({ userId: user.id, tokenHash, expiresAt });

    // TODO: Send email with reset link
    // await emailService.sendPasswordReset(user.email, rawToken);
  },

  // ── Reset Password ────────────────────────────────────────────────────────────
  resetPassword: async (input: ResetPasswordInput) => {
    const tokenHash = hashToken(input.token);
    const record = await authRepository.findPasswordReset(tokenHash);

    if (!record || record.used || new Date() > record.expiresAt) {
      throw AppError.badRequest('Invalid or expired reset token');
    }

    const newHash = await hashPassword(input.password);
    await authRepository.updateUserPassword(record.userId, newHash);
    await authRepository.markPasswordResetUsed(record.id);

    // Invalidate all refresh tokens (force re-login everywhere)
    await authRepository.deleteAllRefreshTokensForUser(record.userId);
  },
};
