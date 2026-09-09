/**
 * CodVedha LMS — Database Seed
 * Creates demo accounts for Admin, Teacher, and Student roles.
 * Run with: npm run prisma:seed
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;
const hashPassword = (password: string) => bcrypt.hash(password, SALT_ROUNDS);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Safety guard: never seed the public placeholder admin password into a
// production database. In production, ADMIN_PASSWORD must be explicitly set to a
// non-default value. Development keeps the convenient fallback.
const isProd = process.env.NODE_ENV === 'production';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
if (isProd && (!process.env.ADMIN_PASSWORD || adminPassword === 'Admin@123')) {
  console.error(
    '❌ Refusing to seed in production with the default ADMIN_PASSWORD. Set a strong ADMIN_PASSWORD env var and re-run.'
  );
  process.exit(1);
}

const users = [
  {
    name: process.env.ADMIN_NAME || 'Administrator',
    email: process.env.ADMIN_EMAIL || 'admin@codvedha.com',
    password: adminPassword,
    role: 'ADMIN' as const,
  },
  {
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@codvedha.com',
    password: 'Teacher@123',
    role: 'TEACHER' as const,
  },
  {
    name: 'Rohan Sharma',
    email: 'rohan.sharma@codvedha.com',
    password: 'Student@123',
    role: 'STUDENT' as const,
  },
];

async function main() {
  console.log('🌱 Seeding CodVedha LMS demo accounts...');
  for (const u of users) {
    const passwordHash = await hashPassword(u.password);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, isActive: true, isEmailVerified: true },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        isActive: true,
        isEmailVerified: true,
      },
    });
    console.log(`  ✓ ${user.role.padEnd(7)} ${user.email}`);
  }
  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
