// ─── Access Token Blacklist (DB-backed + negative cache) ──────────────────────
//
// Access tokens are short-lived (15m) but must be invalidatable before expiry
// (e.g. on logout). Blacklist entries are persisted in the `blacklisted_tokens`
// table so they survive restarts and are shared across instances.
//
// A small in-process cache fronts the DB:
//   - Positive cache: known-blacklisted hashes (until the token's own expiry).
//   - Negative cache: known-clean hashes for 60s, so the common "not blacklisted"
//     case on every authenticated request does not hit the DB each time.
// ─────────────────────────────────────────────────────────────────────────────

import { authRepository } from '../modules/auth/auth.repository';
import { hashToken } from './crypto';

const NEGATIVE_CACHE_TTL_MS = 60 * 1000; // 60s per the workflow spec

// hash -> expiry epoch ms (token is blacklisted until then)
const positiveCache = new Map<string, number>();
// hash -> epoch ms until which we trust "not blacklisted"
const negativeCache = new Map<string, number>();

// Periodically prune caches and expired DB rows.
setInterval(() => {
  const now = Date.now();
  for (const [hash, exp] of positiveCache.entries()) {
    if (now >= exp) positiveCache.delete(hash);
  }
  for (const [hash, exp] of negativeCache.entries()) {
    if (now >= exp) negativeCache.delete(hash);
  }
  // Best-effort DB cleanup; ignore failures (e.g. transient DB blips).
  authRepository.deleteExpiredBlacklistedTokens().catch(() => {});
}, 5 * 60 * 1000);

/**
 * Blacklist an access token until its natural expiry.
 * @param token       raw access token (stored hashed)
 * @param expiresAtMs epoch ms when the JWT expires. Falls back to 15m from now.
 */
export const blacklistToken = async (token: string, expiresAtMs?: number): Promise<void> => {
  const hash = hashToken(token);
  const fallback = Date.now() + 15 * 60 * 1000; // access-token TTL default
  const expiry = expiresAtMs && expiresAtMs > Date.now() ? expiresAtMs : fallback;

  await authRepository.createBlacklistedToken({
    tokenHash: hash,
    expiresAt: new Date(expiry),
  });

  positiveCache.set(hash, expiry);
  negativeCache.delete(hash); // evict any stale "clean" verdict immediately
};

/**
 * Check whether an access token is blacklisted (async — may hit the DB).
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const hash = hashToken(token);
  const now = Date.now();

  // Positive cache hit
  const posExp = positiveCache.get(hash);
  if (posExp !== undefined) {
    if (now < posExp) return true;
    positiveCache.delete(hash);
  }

  // Negative cache hit (recently confirmed clean)
  const negExp = negativeCache.get(hash);
  if (negExp !== undefined && now < negExp) {
    return false;
  }

  // Miss — consult the DB
  const row = await authRepository.findBlacklistedToken(hash);
  if (row && row.expiresAt.getTime() > now) {
    positiveCache.set(hash, row.expiresAt.getTime());
    return true;
  }

  // Clean — remember for 60s
  negativeCache.set(hash, now + NEGATIVE_CACHE_TTL_MS);
  return false;
};
