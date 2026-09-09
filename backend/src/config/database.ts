import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env';

// Prisma v7 requires a driver adapter for direct DB connections.
// PrismaPg accepts the same config as the `pg` Pool constructor.
// ssl.rejectUnauthorized=false is required for Supabase's session pooler
// which presents a self-signed certificate in its TLS chain.
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  ...(env.isDev ? {} : { ssl: { rejectUnauthorized: false } }),
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
