import prisma from './src/config/database';
import fs from 'fs';

async function dump() {
  console.log('Fetching quiz tables...');
  const quizzes = await prisma.quiz.findMany({
    include: {
      questions: { include: { options: true } },
      attempts: true
    }
  });

  fs.writeFileSync('../quiz_db_dump.json', JSON.stringify({ quizzes }, null, 2));
  console.log('✅ Quiz data successfully backed up to LMSadyapan/quiz_db_dump.json');
}

dump().catch(console.error).finally(() => prisma.$disconnect());
