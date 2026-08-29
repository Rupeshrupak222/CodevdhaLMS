// ─── Temp Token Blacklist ─────────────────────────────────────────────────────
//
// Prevents replay of temp tokens after face auth use.
// In-memory store with auto-cleanup (tokens only live 10 minutes anyway).
// ─────────────────────────────────────────────────────────────────────────────

const usedTokens = new Set<string>();

// Clean up expired entries every 15 minutes
setInterval(() => {
  usedTokens.clear(); // Safe because temp tokens expire in 10min anyway
}, 15 * 60 * 1000);

/**
 * Check if a temp token has already been used.
 */
export const isTempTokenUsed = (token: string): boolean => {
  return usedTokens.has(token);
};

/**
 * Mark a temp token as used (prevent replay).
 */
export const markTempTokenUsed = (token: string): void => {
  usedTokens.add(token);
};
