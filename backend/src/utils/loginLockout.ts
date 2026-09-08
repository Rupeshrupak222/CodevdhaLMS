// ─── Account / Device Lockout Service ────────────────────────────────────────
//
// Two layers of brute-force protection, both scoped per DEVICE (IP + User-Agent)
// so that many students behind the same campus WiFi (shared IP) are not locked
// out by one another — only the offending device is affected.
//
//   1. Per-account-per-device: 5 failed attempts on the SAME credentials from a
//      device -> that account is blocked on that device for 10 minutes. The user
//      can still try a DIFFERENT account on the same device.
//   2. Per-device total: 10 failed attempts total (across any accounts) from a
//      device -> the whole device is blocked for 10 minutes.
//
// After the lockout window elapses, attempts are allowed again.
//
// State is in-memory (ephemeral, resets on restart, per-instance). For a
// multi-instance deployment, back these maps with Redis.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';

interface LockoutEntry {
  failedAttempts: number;
  lockedUntil: Date | null;
  lastAttempt: Date;
}

// ── Policies ─────────────────────────────────────────────────────────────────
// Per-account (per device): 5 tries -> 10 min lock.
const ACCOUNT_POLICY = {
  maxAttempts: 5,
  lockoutMinutes: 10,
  windowMinutes: 10,
};

// Per-device total (across all accounts): 10 tries -> 10 min lock.
const DEVICE_POLICY = {
  maxAttempts: 10,
  lockoutMinutes: 10,
  windowMinutes: 10,
};

// Build a stable device fingerprint from IP + User-Agent (hashed).
const deviceKey = (ip: string, userAgent?: string): string => {
  return crypto
    .createHash('sha256')
    .update(`${ip}|${userAgent || 'unknown'}`)
    .digest('hex');
};

// Account lock is scoped to a device: key = deviceKey + email.
const accountKey = (email: string, ip: string, userAgent?: string): string => {
  return crypto
    .createHash('sha256')
    .update(`${deviceKey(ip, userAgent)}|${email.toLowerCase()}`)
    .digest('hex');
};

// account-per-device store, and device-total store
const accountStore = new Map<string, LockoutEntry>();
const deviceStore = new Map<string, LockoutEntry>();

// Clean up stale entries every 30 minutes (both stores)
setInterval(() => {
  const now = new Date();
  for (const store of [accountStore, deviceStore]) {
    for (const [key, entry] of store.entries()) {
      const timeSinceLastAttempt = now.getTime() - entry.lastAttempt.getTime();
      if (timeSinceLastAttempt > 60 * 60 * 1000) { // 1 hour stale
        store.delete(key);
      }
    }
  }
}, 30 * 60 * 1000);

// Shared helpers ---------------------------------------------------------------

const checkLocked = (
  store: Map<string, LockoutEntry>,
  key: string
): { locked: boolean; remainingSeconds: number } => {
  const entry = store.get(key);
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

const recordFailure = (
  store: Map<string, LockoutEntry>,
  key: string,
  policy: { maxAttempts: number; lockoutMinutes: number; windowMinutes: number }
): { locked: boolean; attemptsRemaining: number } => {
  const now = new Date();
  let entry = store.get(key);
  if (!entry) {
    entry = { failedAttempts: 0, lockedUntil: null, lastAttempt: now };
    store.set(key, entry);
  }

  // Reset the counter if the last attempt was outside the observation window
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

// ── Per-account (per device) ──────────────────────────────────────────────────

/**
 * Is this account currently locked out ON THIS DEVICE?
 */
export const isAccountLocked = (
  email: string,
  ip: string,
  userAgent?: string
): { locked: boolean; remainingSeconds: number } => {
  return checkLocked(accountStore, accountKey(email, ip, userAgent));
};

/**
 * Record a failed attempt for this account on this device.
 * 5 failures within the window -> account locked on this device for 10 min.
 */
export const recordFailedAttempt = (
  email: string,
  ip: string,
  userAgent?: string
): { locked: boolean; attemptsRemaining: number } => {
  return recordFailure(accountStore, accountKey(email, ip, userAgent), ACCOUNT_POLICY);
};

/**
 * Clear the account-on-device lock on a successful login.
 */
export const clearLockout = (email: string, ip: string, userAgent?: string): void => {
  accountStore.delete(accountKey(email, ip, userAgent));
};

// ── Per-device total ────────────────────────────────────────────────────────

/**
 * Is this device currently locked out (10 total failures)?
 */
export const isIpLockedOut = (
  ip: string,
  userAgent?: string
): { locked: boolean; remainingSeconds: number } => {
  return checkLocked(deviceStore, deviceKey(ip, userAgent));
};

/**
 * Record a failed attempt against the device total (across all accounts).
 * 10 failures within the window -> device blocked for 10 min.
 */
export const recordFailedIpAttempt = (ip: string, userAgent?: string): { locked: boolean } => {
  const { locked } = recordFailure(deviceStore, deviceKey(ip, userAgent), DEVICE_POLICY);
  return { locked };
};

/**
 * Clear the device-total counter on a successful login.
 */
export const clearIpLockout = (ip: string, userAgent?: string): void => {
  deviceStore.delete(deviceKey(ip, userAgent));
};
