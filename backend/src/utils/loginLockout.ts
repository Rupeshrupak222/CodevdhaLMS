// ─── Account Lockout Service ─────────────────────────────────────────────────
//
// In-memory lockout tracker. Locks accounts after too many failed login attempts.
// Supports role-based lockout policies (stricter for admins).
//
// No database changes required — state is ephemeral (resets on server restart).
// For production at scale, replace with Redis for shared state across instances.
// ─────────────────────────────────────────────────────────────────────────────

interface LockoutEntry {
  failedAttempts: number;
  lockedUntil: Date | null;
  lastAttempt: Date;
}

// ── Lockout policies by role ─────────────────────────────────────────────────
const LOCKOUT_POLICIES = {
  ADMIN: {
    maxAttempts: 3,           // Stricter: only 3 attempts
    lockoutMinutes: 30,       // Longer lock: 30 minutes
    windowMinutes: 30,        // Longer observation window
  },
  DEFAULT: {
    maxAttempts: 5,           // Standard: 5 attempts
    lockoutMinutes: 15,       // Standard lock: 15 minutes
    windowMinutes: 15,        // Standard window
  },
};

const lockoutStore = new Map<string, LockoutEntry>();

// Clean up stale entries every 30 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, entry] of lockoutStore.entries()) {
    const timeSinceLastAttempt = now.getTime() - entry.lastAttempt.getTime();
    if (timeSinceLastAttempt > 60 * 60 * 1000) { // 1 hour stale
      lockoutStore.delete(key);
    }
  }
}, 30 * 60 * 1000);

/**
 * Get the lockout policy for a given role.
 */
const getPolicy = (role?: string) => {
  if (role === 'ADMIN') return LOCKOUT_POLICIES.ADMIN;
  return LOCKOUT_POLICIES.DEFAULT;
};

/**
 * Check if an account (by email) is currently locked out.
 */
export const isAccountLocked = (email: string): { locked: boolean; remainingSeconds: number } => {
  const key = email.toLowerCase();
  const entry = lockoutStore.get(key);

  if (!entry || !entry.lockedUntil) {
    return { locked: false, remainingSeconds: 0 };
  }

  const now = new Date();
  if (now >= entry.lockedUntil) {
    entry.lockedUntil = null;
    entry.failedAttempts = 0;
    return { locked: false, remainingSeconds: 0 };
  }

  const remaining = Math.ceil((entry.lockedUntil.getTime() - now.getTime()) / 1000);
  return { locked: true, remainingSeconds: remaining };
};

/**
 * Record a failed login attempt. Uses role-specific policy.
 * Pass the user's role if known (from DB lookup), otherwise uses DEFAULT policy.
 */
export const recordFailedAttempt = (email: string, role?: string): { locked: boolean; attemptsRemaining: number } => {
  const key = email.toLowerCase();
  const now = new Date();
  const policy = getPolicy(role);

  let entry = lockoutStore.get(key);

  if (!entry) {
    entry = { failedAttempts: 0, lockedUntil: null, lastAttempt: now };
    lockoutStore.set(key, entry);
  }

  // Reset counter if last attempt was outside the observation window
  const timeSinceLastAttempt = now.getTime() - entry.lastAttempt.getTime();
  if (timeSinceLastAttempt > policy.windowMinutes * 60 * 1000) {
    entry.failedAttempts = 0;
    entry.lockedUntil = null;
  }

  entry.failedAttempts += 1;
  entry.lastAttempt = now;

  if (entry.failedAttempts >= policy.maxAttempts) {
    entry.lockedUntil = new Date(now.getTime() + policy.lockoutMinutes * 60 * 1000);
    return { locked: true, attemptsRemaining: 0 };
  }

  return { locked: false, attemptsRemaining: policy.maxAttempts - entry.failedAttempts };
};

/**
 * Clear lockout on successful login.
 */
export const clearLockout = (email: string): void => {
  lockoutStore.delete(email.toLowerCase());
};
