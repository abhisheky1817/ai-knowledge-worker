import { env } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { geminiConfigured } from './services/gemini.service.js';

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`AI Knowledge Worker API running on http://localhost:${env.port}`);
  if (!geminiConfigured()) {
    console.warn('! GEMINI_API_KEY is not set - uploads and questions will fail until you add it to backend/.env');
  }
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
