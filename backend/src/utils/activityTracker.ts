// ─── User Activity Tracker ───────────────────────────────────────────────────
//
// Tracks the last API activity timestamp per user (in memory).
// Used to determine if a session is "active" or "idle" during login.
//
// - If last activity < 15 min ago → session is ACTIVE → show popup
// - If last activity > 15 min ago → session is IDLE/EXPIRED → no popup, normal login
// ─────────────────────────────────────────────────────────────────────────────

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const activityMap = new Map<string, number>(); // userId → timestamp (ms)

// Clean up stale entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, lastActive] of activityMap.entries()) {
    if (now - lastActive > IDLE_TIMEOUT_MS * 2) {
      activityMap.delete(userId);
    }
  }
}, 30 * 60 * 1000);

/**
 * Record user activity (call on every authenticated request).
 */
export const recordActivity = (userId: string): void => {
  activityMap.set(userId, Date.now());
};

/**
 * Check if a user's session is currently active (used within last 15 min).
 */
export const isSessionActive = (userId: string): boolean => {
  const lastActive = activityMap.get(userId);
  if (!lastActive) return false;
  return (Date.now() - lastActive) < IDLE_TIMEOUT_MS;
};

/**
 * Clear activity record (on logout or session end).
 */
export const clearActivity = (userId: string): void => {
  activityMap.delete(userId);
};
