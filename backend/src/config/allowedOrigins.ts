import { env } from './env';

// ── Single source of truth for allowed browser origins ───────────────────────
// Used by BOTH the CORS policy (app.ts) and the CSRF Origin/Referer check
// (verifyOrigin middleware) so the two can never drift apart.
//
//   - Production origins are HTTPS-only and always allowed.
//   - Development origins (localhost dev servers + the plaintext host) are only
//     allowed when NOT running in production, to keep the credentialed API's
//     cross-origin surface small in prod.

const PROD_ORIGINS = [
  env.FRONTEND_URL,
  'https://my.codvedha.com',
  'https://lms.codvedha.com',
];

const DEV_ORIGINS = [
  'http://my.codvedha.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
];

export const getAllowedOrigins = (): string[] =>
  env.isProd ? [...PROD_ORIGINS] : [...PROD_ORIGINS, ...DEV_ORIGINS];

/** True if the given Origin header value is in the allowlist. */
export const isAllowedOrigin = (origin: string | undefined | null): boolean => {
  if (!origin) return false;
  return getAllowedOrigins().includes(origin);
};
