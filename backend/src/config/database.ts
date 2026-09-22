import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env';

// ── Database TLS configuration ────────────────────────────────────────────────
// Prisma v7 requires a driver adapter for direct DB connections. PrismaPg accepts
// the same config as the `pg` Pool constructor.
//
// TLS policy:
//   - Development: no explicit ssl config (local Postgres, typically plaintext).
//   - Production WITH DATABASE_CA_CERT: verify the server certificate against the
//     provided CA (rejectUnauthorized:true). This is the secure path — it keeps
//     TLS authentication ON, defeating MITM, while still trusting a provider CA
//     (e.g. Supabase's) that isn't in Node's default bundle.
//   - Production WITHOUT DATABASE_CA_CERT: fall back to rejectUnauthorized:false
//     (encrypted but unauthenticated) and log a warning. This preserves the
//     existing Supabase-pooler behaviour so deployments don't break, but flags
//     that the connection is not verifying the server identity.
const resolveDbCaCert = (): string | undefined => {
  const raw = env.DATABASE_CA_CERT.trim();
  if (!raw) return undefined;
  // Accept either the PEM contents directly or a path to a .pem/.crt file.
  if (raw.includes('BEGIN CERTIFICATE')) return raw;
  try {
    return fs.readFileSync(raw, 'utf8');
  } catch {
    console.warn(`[DB] DATABASE_CA_CERT points to a file that could not be read: ${raw}`);
    return undefined;
  }
};

const buildSslConfig = (): { rejectUnauthorized: boolean; ca?: string } | undefined => {
  if (env.isDev) return undefined;

  const ca = resolveDbCaCert();
  if (ca) {
    // Secure: verify the server cert against the provided CA.
    return { rejectUnauthorized: true, ca };
  }

  // Fallback: keep the connection working but warn that it is unverified.
  console.warn(
    '[SECURITY] Database TLS certificate verification is DISABLED (no DATABASE_CA_CERT set). ' +
      'The DB connection is encrypted but not authenticated (MITM risk). ' +
      "Set DATABASE_CA_CERT to your provider's CA certificate to enable verification."
  );
  return { rejectUnauthorized: false };
};

const sslConfig = buildSslConfig();

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  ...(sslConfig ? { ssl: sslConfig } : {}),
});

const baseClient = new PrismaClient({
  adapter,
  log: env.isDev ? ['error', 'warn'] : ['error'],
});

const extendedClient = baseClient.$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
        const maxRetries = 4;
        let lastError: any;
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await query(args);
          } catch (error: any) {
            lastError = error;
            const isNetworkError =
              error.code === 'P1001' ||
              error.message?.includes('DatabaseNotReachable') ||
              error.message?.includes('ENOTFOUND');
            const isPoolExhausted =
              error.message?.includes('EMAXCONNSESSION') ||
              error.message?.includes('max clients reached');
            if ((isNetworkError || isPoolExhausted) && i < maxRetries - 1) {
              const delay = isPoolExhausted ? 1000 * (i + 1) : 3000;
              console.warn(
                `[DB Retry] ${isPoolExhausted ? 'Pool exhausted' : 'Network issue'} on ${model}.${operation}. Retrying in ${delay}ms... (${i + 1}/${maxRetries})`
              );
              await new Promise((res) => setTimeout(res, delay));
              continue;
            }
            throw error;
          }
        }
        throw lastError;
      },
    },
  },
});

const globalForPrisma = globalThis as unknown as {
  prisma: typeof extendedClient | undefined;
};

export const prisma = globalForPrisma.prisma || extendedClient;

if (env.isDev) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
