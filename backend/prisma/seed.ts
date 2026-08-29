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

const users = [
  {
    name: process.env.ADMIN_NAME || 'Administrator',
    email: process.env.ADMIN_EMAIL || 'admin@codvedha.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
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
