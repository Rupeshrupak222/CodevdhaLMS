import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// ── JWT secret hardening ──────────────────────────────────────────────────────
// Reject the shipped placeholder secrets outright (they are public knowledge and
// would let anyone forge tokens). Warn on secrets that are too short to be safe.
const isProdEnv = process.env.NODE_ENV === 'production';

const KNOWN_DEFAULT_SECRETS = new Set([
  'change-me-access-secret',
  'change-me-refresh-secret',
  'secret',
  'changeme',
  'your-secret',
]);

const MIN_SECRET_LENGTH = 32;

const jwtSecrets: Array<{ name: string; value: string }> = [
  { name: 'JWT_ACCESS_SECRET', value: process.env.JWT_ACCESS_SECRET! },
  { name: 'JWT_REFRESH_SECRET', value: process.env.JWT_REFRESH_SECRET! },
];

for (const secret of jwtSecrets) {
  if (KNOWN_DEFAULT_SECRETS.has(secret.value.trim())) {
    throw new Error(
      `${secret.name} is still set to a default placeholder value. Generate a strong random secret (e.g. \`openssl rand -hex 32\`) before starting the server.`
    );
  }

  if (secret.value.length < MIN_SECRET_LENGTH) {
    const message = `${secret.name} is shorter than ${MIN_SECRET_LENGTH} characters. Use a longer, high-entropy value for production security.`;
    if (isProdEnv) {
      throw new Error(message);
    }
    console.warn(`[SECURITY] ${message}`);
  }
}

// Access and refresh secrets must not be identical — otherwise the type-claim
// separation between the two token classes provides no real isolation.
if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
  const message = 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are identical. Use distinct secrets so access tokens cannot be replayed as refresh tokens.';
  if (isProdEnv) {
    throw new Error(message);
  }
  console.warn(`[SECURITY] ${message}`);
}

// ── Admin bootstrap password hardening ────────────────────────────────────────
// ADMIN_PASSWORD is only consumed by the seed script (never at runtime login), so
// it is optional and unset deployments are unaffected. But if it IS set, the
// shipped placeholder ("Admin@123") is public knowledge and must never reach a
// production seed. Reject the known weak default and enforce a minimum length in
// production; warn (don't block) in development so local seeding stays frictionless.
const KNOWN_DEFAULT_ADMIN_PASSWORDS = new Set([
  'Admin@123',
  'admin',
  'password',
  'changeme',
]);

const MIN_ADMIN_PASSWORD_LENGTH = 12;

const adminPassword = process.env.ADMIN_PASSWORD;
if (adminPassword) {
  if (KNOWN_DEFAULT_ADMIN_PASSWORDS.has(adminPassword.trim())) {
    const message = 'ADMIN_PASSWORD is set to a known default/placeholder value. Set a strong, unique admin password before seeding a production database.';
    if (isProdEnv) {
      throw new Error(message);
    }
    console.warn(`[SECURITY] ${message}`);
  } else if (adminPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
    const message = `ADMIN_PASSWORD is shorter than ${MIN_ADMIN_PASSWORD_LENGTH} characters. Use a longer, high-entropy value for production.`;
    if (isProdEnv) {
      throw new Error(message);
    }
    console.warn(`[SECURITY] ${message}`);
  }
}

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL!,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@codvedha.com',

  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  ADMIN_NAME: process.env.ADMIN_NAME || 'Administrator',

  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_REGION: process.env.AWS_REGION || 'ap-south-1',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || '',

  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',
};

