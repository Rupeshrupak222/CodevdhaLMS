import prisma from './src/config/database';

async function main() {
  console.log('Connecting...');
  await prisma.$connect();
  console.log('Connected!');

  console.log('Upserting...');
  await prisma.category.upsert({
    where: { slug: 'test-ping' },
    update: { name: 'Test' },
    create: { name: 'Test', slug: 'test-ping' }
  });
  console.log('Upserted!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
