import axios from 'axios';
import { toast } from 'react-hot-toast';

// Storage keys (single source of truth, shared with the auth context)
// NOTE: token + sessionId live in sessionStorage (per-tab, cleared on tab/browser
// close) — this is what makes closing a tab or the browser return to /login.
export const TOKEN_KEY = 'lms-token';
export const SESSION_ID_KEY = 'lms-session-id';
// Cross-tab logout broadcast channel (localStorage fires 'storage' in other tabs)
export const LOGOUT_BROADCAST_KEY = 'lms-logout-broadcast';
// Browser-wide "currently logged-in account" marker. Holds ONLY the userId (never
// the token) so we can enforce one-account-per-browser: if a different account
// logs in, other tabs see this change and sign themselves out.
export const ACTIVE_USER_KEY = 'lms-active-user';

/** Clear all per-tab auth state (token + session id). */
export const clearClientAuth = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_ID_KEY);
};

/** Mark which account is active in this browser (broadcasts to other tabs). */
export const setActiveUser = (userId: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_USER_KEY, userId);
  } catch {
    /* storage unavailable (private mode) — ignore */
  }
};

/** Read the browser-wide active account marker. */
export const getActiveUser = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_USER_KEY);
  } catch {
    return null;
  }
};

/** Clear the browser-wide active account marker. */
export const clearActiveUser = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACTIVE_USER_KEY);
  } catch {
    /* ignore */
  }
};

/** Broadcast a logout to every other tab of the same browser. */
export const broadcastLogout = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACTIVE_USER_KEY); // no account active anymore
    localStorage.setItem(LOGOUT_BROADCAST_KEY, String(Date.now()));
  } catch {
    /* storage may be unavailable (private mode) — ignore */
  }
};

// Public pages that should never redirect to /login on auth failure
const PUBLIC_PAGES = ['/privacy', '/terms', '/contact'];

const isPublicPage = () => {
  if (typeof window === 'undefined') return false;
  return PUBLIC_PAGES.includes(window.location.pathname);
};

let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

const flushPendingRequests = (token: string | null) => {
  pendingRequests.forEach((callback) => callback(token));
  pendingRequests = [];
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send HttpOnly cookies for JWT
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to attach access token + session id + timezone
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Single-session binding — backend rejects protected requests without a
    // matching X-Session-Id.
    const sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (sessionId) {
      config.headers['X-Session-Id'] = sessionId;
    }
    // Client timezone (used by the backend for locale-aware timestamps)
    try {
      config.headers['X-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      /* ignore if unavailable */
    }
  }
  return config;
});

// Response Interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url?.includes('/auth/login')) {
      const errMsg = error.response?.data?.message || 'Invalid email or password';
      toast.error(errMsg);
      return Promise.reject(error);
    }

    // Bypass refresh logic and automatic toasts for face auth endpoints
    const isFaceAuthEndpoint = originalRequest.url?.includes('/auth/face-verify') || originalRequest.url?.includes('/auth/face-enroll');

    if (error.response?.status === 401 && !originalRequest.url?.includes('/auth/refresh') && !isFaceAuthEndpoint) {
      // Force-logout (another device took over) or revoked token (logged out
      // elsewhere / blacklisted) — both mean this session is dead. Do not retry.
      const authCode = error.response?.data?.code;
      if (authCode === 'FORCE_LOGOUT' || authCode === 'TOKEN_REVOKED') {
        if (typeof window !== 'undefined') {
          clearClientAuth();
          broadcastLogout(); // notify other tabs
          // Redirect immediately — don't retry, don't queue
          if (!window.location.pathname.includes('/login') && !isPublicPage()) {
            const msg = authCode === 'FORCE_LOGOUT'
              ? 'Session ended. You have been logged in on another device.'
              : 'Your session has ended. Please log in again.';
            toast.error(msg, { duration: 4000 });
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        if (typeof window !== 'undefined') {
          clearClientAuth();
          if (!window.location.pathname.includes('/login') && !isPublicPage()) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push((token) => {
            if (!token) {
              reject(error);
              return;
            }

            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await api.post('/auth/refresh');
        const newToken = refreshResponse?.data?.data?.accessToken;
        const newSessionId = refreshResponse?.data?.data?.sessionId;
        if (!newToken) {
          throw new Error('No access token returned from refresh endpoint');
        }

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(TOKEN_KEY, newToken);
          // Refresh rotates/preserves the session id — keep it in sync so the
          // next request sends the correct X-Session-Id.
          if (newSessionId) {
            sessionStorage.setItem(SESSION_ID_KEY, newSessionId);
          }
        }

        flushPendingRequests(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        flushPendingRequests(null);
        if (typeof window !== 'undefined') {
          clearClientAuth();
          broadcastLogout();
          if (!window.location.pathname.includes('/login') && !isPublicPage()) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status !== 401 && !isFaceAuthEndpoint) {
      const responseData = error.response?.data;
      if (responseData && responseData.message === 'Validation failed' && Array.isArray(responseData.errors)) {
        console.error('[Validation Error Details]', responseData.errors);
      } else {
        console.error('[API Error]', error.response?.data || error.message);
      }
    }

    // Scrub credentials off the error object so a stray console.error(err) can't
    // leak the bearer token / session id / request body into devtools or logs.
    if (error.config) {
      if (error.config.headers) {
        delete error.config.headers.Authorization;
        delete error.config.headers['X-Session-Id'];
      }
      delete error.config.data;
    }

    return Promise.reject(error);
  }
);

// SWR fetcher utility
export const fetcher = (url: string) => api.get(url).then(res => res.data.data);
