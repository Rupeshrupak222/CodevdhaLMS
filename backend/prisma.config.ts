import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  migrate: {
    adapter: undefined,
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
