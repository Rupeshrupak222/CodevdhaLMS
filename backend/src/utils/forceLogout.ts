// ─── Force Logout Registry ───────────────────────────────────────────────────
//
// When a user force-logs in from another device, the previous session must be
// terminated immediately. This registry tracks which users should be kicked out.
//
// We store the NEW access token so we can exclude it from force-logout.
// Any request with a DIFFERENT token gets kicked.
// ─────────────────────────────────────────────────────────────────────────────

const forceLogoutMap = new Map<string, string>(); // userId → newAccessToken (to exclude)

/**
 * Mark a user for immediate force-logout. Store the new token to exclude it.
 */
export const markForceLogout = (userId: string, newAccessToken: string): void => {
  forceLogoutMap.set(userId, newAccessToken);
  // Auto-clear after 5 minutes (if old device never makes a request)
  setTimeout(() => {
    if (forceLogoutMap.get(userId) === newAccessToken) {
      forceLogoutMap.delete(userId);
    }
  }, 5 * 60 * 1000);
};

/**
 * Check if a user should be force-logged out.
 * Returns true if the token being used is NOT the new one.
 * Does NOT clear the flag — keeps rejecting until old token expires or 5min timeout.
 */
export const shouldForceLogout = (userId: string, currentToken: string): boolean => {
  const newToken = forceLogoutMap.get(userId);
  if (!newToken) return false;

  // If the current request is using the NEW token, allow it
  if (currentToken === newToken) {
    return false;
  }

  // Old token — reject (don't clear flag, keep rejecting all old-token requests)
  return true;
};
