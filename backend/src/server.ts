import { createApp } from './app';
import { env } from './config/env';
import prisma from './config/database';

const server = createApp();

const start = async () => {
  try {
    // Test DB connection and seed with retry mechanism to handle intermittent internet drops
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await prisma.$connect();
        if (attempt === 1) console.log('✅ Database connected successfully');
        else console.log(`✅ Database connected successfully on attempt ${attempt}`);

        // Auto-add recordingUrl column if not exists (safe migration)
        try {
          await prisma.$executeRawUnsafe(`
            ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS "recordingUrl" TEXT;
          `);
        } catch (e: any) {
          // Ignore if column already exists or syntax not supported
          if (!e.message?.includes('already exists')) {
            console.warn('⚠️ Could not auto-add recordingUrl column:', e.message);
          }
        }

        // Auto-seed default categories if they do not exist
        const categoriesToSeed = [
          { name: 'Civil', slug: 'civil' },
          { name: 'CodVedha Special', slug: 'codvedha-special' },
          { name: 'CSE and IT', slug: 'cse-and-it' },
          { name: 'ECE and EEE', slug: 'ece-and-eee' },
          { name: 'Management', slug: 'management' },
          { name: 'PharmaTech', slug: 'pharmatech' },
        ];
        
        for (const cat of categoriesToSeed) {
          await prisma.category.upsert({
            where: { slug: cat.slug },
            update: { name: cat.name },
            create: cat,
          });
        }
        console.log('✅ Default categories verified/seeded');

        break; // Break the retry loop if successful
      } catch (error: any) {
        if (attempt === maxRetries) throw error;
        console.log(`⚠️ Database connection attempt ${attempt} failed (likely due to network drop). Retrying in 3 seconds...`);
        await new Promise(res => setTimeout(res, 3000));
      }
    }

    server.listen(env.PORT, () => {
      console.log(`\n🚀 CodVedha LMS API running`);
      console.log(`   Environment : ${env.NODE_ENV}`);
      console.log(`   Port        : ${env.PORT}`);
      console.log(`   URL         : http://localhost:${env.PORT}/api`);
      console.log(`   Health      : http://localhost:${env.PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

start();

