// ─── Temp Token Blacklist ─────────────────────────────────────────────────────
//
// Prevents replay of temp tokens after face-auth use.
//
// In-memory store keyed by token -> expiry epoch ms. Each entry is kept until the
// underlying JWT actually expires, then pruned. This avoids a replay window that
// a fixed-interval blanket clear would open: a token used shortly before the
// sweep could otherwise be wiped from the set while still being JWT-valid,
// letting it be replayed.
// ─────────────────────────────────────────────────────────────────────────────

import { decodeJwt } from './jwt';

// Temp tokens are signed with a 10-minute validity (see generateTempToken).
const TEMP_TOKEN_TTL_MS = 10 * 60 * 1000;

// token -> epoch ms when it expires (safe to forget after this)
const usedTokens = new Map<string, number>();

// Prune only entries that have actually expired, every 5 minutes.
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAtMs] of usedTokens.entries()) {
    if (now >= expiresAtMs) {
      usedTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a temp token has already been used. Expired entries are treated as
 * absent (and lazily removed) — but by then the JWT itself is invalid anyway.
 */
export const isTempTokenUsed = (token: string): boolean => {
  const expiresAtMs = usedTokens.get(token);
  if (expiresAtMs === undefined) return false;
  if (Date.now() >= expiresAtMs) {
    usedTokens.delete(token);
    return false;
  }
  return true;
};

/**
 * Mark a temp token as used (prevent replay) until it naturally expires.
 */
export const markTempTokenUsed = (token: string): void => {
  const decoded = decodeJwt(token);
  const expiry = decoded?.exp ? decoded.exp * 1000 : Date.now() + TEMP_TOKEN_TTL_MS;
  usedTokens.set(token, expiry);
};
